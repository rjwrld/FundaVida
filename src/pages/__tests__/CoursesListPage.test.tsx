import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { CoursesListPage } from '@/pages/CoursesListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage(entry = '/app/courses') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/app/courses" element={<CoursesListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<CoursesListPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows add course button for admin role', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument()
    })
  })

  it('shows add course button for teacher role (ADR-0016)', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Button should exist for teachers who can now create courses
    const addButton = screen.getByRole('button', { name: /add course/i })
    expect(addButton).toBeInTheDocument()
  })

  it('shows action column header only for admin role', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  // ADR-0016: a Teacher may edit the Courses they own. The row check needs the
  // Course in context — a context-free check denied the Teacher everywhere, so the
  // Actions column rendered empty for them.
  it('gives a teacher Edit on their own live courses, and none on a closed one', async () => {
    useStore.getState().setRole('teacher')
    const { courses, currentUserId } = useStore.getState()
    const own = courses.filter((c) => c.teacherId === currentUserId)
    const live = own.find((c) => c.status === 'published')
    const closed = own.find((c) => c.status === 'closed')
    if (!live || !closed) throw new Error('seed: acting teacher needs a live and a closed course')
    if (own.length > 10) throw new Error('seed: teacher courses no longer fit one page')
    renderPage()

    const edits = await screen.findAllByRole('button', { name: `Edit ${live.name}` })
    expect(edits.length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('button', { name: `Edit ${closed.name}` })).toHaveLength(0)

    // The edit form opens for the Teacher, not just the button.
    edits[0]?.click()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('lets a teacher save an edit to their own live course end to end', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('teacher')
    const { courses, currentUserId } = useStore.getState()
    const live = courses.find((c) => c.teacherId === currentUserId && c.status === 'published')
    if (!live) throw new Error('seed: acting teacher needs a live course')
    renderPage()

    const [edit] = await screen.findAllByRole('button', { name: `Edit ${live.name}` })
    if (!edit) throw new Error('expected an Edit button')
    await user.click(edit)
    const dialog = await screen.findByRole('dialog')
    const description = within(dialog).getByLabelText('Description')
    await waitFor(() => expect(description).toHaveValue(live.description))
    await user.clear(description)
    await user.type(description, 'Updated by its teacher')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(useStore.getState().courses.find((c) => c.id === live.id)?.description).toBe(
        'Updated by its teacher'
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  // A closed cohort is terminal (ADR-0024): no row offers Edit on it, so a
  // hand-typed ?edit= link must not open the form either — not even for admin.
  it('does not open the edit form for a closed course from a ?edit= link', async () => {
    useStore.getState().setRole('admin')
    const closed = useStore.getState().courses.find((c) => c.status === 'closed')
    if (!closed) throw new Error('seed: no closed course')
    renderPage(`/app/courses?edit=${closed.id}`)

    await screen.findByRole('table')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('still opens the edit form for a live course from a ?edit= link', async () => {
    useStore.getState().setRole('admin')
    const live = useStore.getState().courses.find((c) => c.status === 'published')
    if (!live) throw new Error('seed: no live course')
    renderPage(`/app/courses?edit=${live.id}`)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('windows the scoped courses to the default page size', async () => {
    useStore.getState().setRole('admin')
    const total = useStore.getState().courses.length
    expect(total).toBeGreaterThan(10) // guard: the seed must exceed one page
    renderPage()

    const table = await screen.findByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(10)
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 10)}`)).toBeInTheDocument()
  })
})

describe('<CoursesListPage /> — shared-element morph source (ADR-0047 phase 6c)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Pins the viewport so `useDataTableSurface` resolves to one branch or the other. */
  function matchViewport(matches: boolean) {
    const noop = vi.fn()
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches,
          media: query,
          addEventListener: noop,
          removeEventListener: noop,
          addListener: noop,
          removeListener: noop,
          dispatchEvent: () => false,
          onchange: null,
        }) as unknown as MediaQueryList
    )
  }

  /**
   * The DataTable renders every row twice — the real table plus a `display:none`
   * stacked card — so a `layoutId` set unconditionally in the name cell would
   * register two nodes per Course, and framer could lead the morph from the hidden,
   * zero-area one. Exactly one node per Course may carry it, on the live surface.
   */
  it('registers the shared element once per Course, on the table surface', async () => {
    matchViewport(true) // ≥ sm: the table is the live render
    const { container } = renderPage()

    await screen.findByRole('table')
    const morphNodes = Array.from(container.querySelectorAll('[data-morph-id]'))
    const ids = morphNodes.map((node) => node.getAttribute('data-morph-id'))

    expect(morphNodes.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    morphNodes.forEach((node) => expect(node.closest('table')).not.toBeNull())
  })

  it('hands the shared element to the stacked cards below sm', async () => {
    matchViewport(false) // < sm: the cards are the live render
    const { container } = renderPage()

    await screen.findByRole('table')
    const morphNodes = Array.from(container.querySelectorAll('[data-morph-id]'))
    const ids = morphNodes.map((node) => node.getAttribute('data-morph-id'))

    expect(morphNodes.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    morphNodes.forEach((node) => expect(node.closest('table')).toBeNull())
  })
})
