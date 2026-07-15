import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/courses']}>
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

  it('hides add course button for student role', async () => {
    useStore.getState().setRole('student')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Button should not exist
    const addButton = screen.queryByRole('button', { name: /add course/i })
    expect(addButton).not.toBeInTheDocument()
  })

  it('shows action column header only for admin role', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  it('hides action column header for teacher role', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Actions header should not exist
    const actionsHeader = screen.queryByText('Actions')
    expect(actionsHeader).not.toBeInTheDocument()
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
