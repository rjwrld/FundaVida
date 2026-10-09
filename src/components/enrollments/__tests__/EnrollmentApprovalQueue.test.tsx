import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <EnrollmentApprovalQueue />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** Clear every pending request, then re-pend `n` approved ones on open cohorts. */
function pendExactly(n: number) {
  const { enrollments, courses } = useStore.getState()
  const open = new Set(courses.filter((c) => c.status === 'published').map((c) => c.id))
  const targets = new Set(
    enrollments
      .filter((e) => e.status === 'approved' && open.has(e.courseId))
      .slice(0, n)
      .map((e) => e.id)
  )
  if (targets.size !== n) throw new Error(`seed needs ${n} approved enrollments on open cohorts`)
  useStore.setState({
    enrollments: enrollments.map((e) =>
      targets.has(e.id)
        ? { ...e, status: 'pending' as const }
        : e.status === 'pending'
          ? { ...e, status: 'rejected' as const }
          : e
    ),
  })
}

describe('<EnrollmentApprovalQueue /> (admin: every pending request)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('is a titled card counting the pending requests', async () => {
    pendExactly(2)
    renderQueue()

    const card = await screen.findByRole('region', { name: 'Enrollment requests' })
    const heading = within(card).getByRole('heading', { level: 3, name: 'Enrollment requests' })
    expect(heading.parentElement).toHaveTextContent('2')
    expect(within(within(card).getByRole('table')).getAllByRole('row')).toHaveLength(3)
  })

  it('drops a rejected request from the queue', async () => {
    const user = userEvent.setup()
    pendExactly(2)
    renderQueue()

    const table = await screen.findByRole('table')
    const firstRow = within(table).getAllByRole('row')[1]
    if (!firstRow) throw new Error('queue should have a row')
    await user.click(within(firstRow).getByRole('button', { name: /^reject/i }))

    await expect.poll(() => within(table).getAllByRole('row').length).toBe(2)
  })

  it('stays on screen with a compact empty state when nothing is pending', async () => {
    pendExactly(0)
    renderQueue()

    const card = await screen.findByRole('region', { name: 'Enrollment requests' })
    expect(within(card).getByText('No enrollment requests waiting.')).toBeInTheDocument()
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('<EnrollmentApprovalQueue /> reads the scope seam (ADR-0008/0030)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })
  afterEach(() => vi.restoreAllMocks())

  // Rows name a student and a course from two more reads; painting before they
  // resolve would show blank or stale cells.
  it.each(['courses', 'students'] as const)(
    'paints no row until the scoped %s read resolves',
    async (resource) => {
      useStore.getState().setRole('admin')
      pendExactly(1)
      let resolved = false
      // Wrap the real list with a delay; the cast spans the two resources' signatures.
      const target = api[resource] as { list: (...args: unknown[]) => Promise<unknown> }
      const list = target.list.bind(target)
      vi.spyOn(target, 'list').mockImplementation(async (...args: unknown[]) => {
        await delay(400)
        const result = await list(...args)
        resolved = true
        return result
      })

      let rowBeforeRead = false
      const observer = new MutationObserver(() => {
        if (!resolved && document.querySelector('tbody tr')) rowBeforeRead = true
      })
      observer.observe(document.body, { childList: true, subtree: true })
      try {
        renderQueue()
        expect(await screen.findByRole('table', {}, { timeout: 3000 })).toBeInTheDocument()
        expect(rowBeforeRead).toBe(false)
      } finally {
        observer.disconnect()
      }
    }
  )

  it("shows a teacher only their own Courses' requests, named through the seam", async () => {
    useStore.getState().setRole('teacher')
    const { currentUserId, courses, enrollments, students } = useStore.getState()
    const own = courses.find((c) => c.teacherId === currentUserId && c.status === 'published')
    const foreign = courses.find((c) => c.teacherId !== currentUserId && c.status === 'published')
    if (!own || !foreign) throw new Error('seed: need an owned and a foreign published course')
    const ownEnr = enrollments.find((e) => e.courseId === own.id && e.status === 'approved')
    const foreignEnr = enrollments.find((e) => e.courseId === foreign.id && e.status === 'approved')
    if (!ownEnr || !foreignEnr) throw new Error('seed: need enrollments on both courses')
    useStore.setState({
      enrollments: enrollments.map((e) =>
        e.id === ownEnr.id || e.id === foreignEnr.id
          ? { ...e, status: 'pending' as const }
          : e.status === 'pending'
            ? { ...e, status: 'rejected' as const }
            : e
      ),
    })
    const ownStudent = students.find((s) => s.id === ownEnr.studentId)
    if (!ownStudent) throw new Error('seed: owned enrollment student missing')

    renderQueue()

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent(`${ownStudent.firstName} ${ownStudent.lastName}`)
    expect(rows[0]).toHaveTextContent(own.name)
  })
})
