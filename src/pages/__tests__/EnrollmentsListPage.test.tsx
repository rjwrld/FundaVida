import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { shortCourseName } from '@/lib/courseName'
import { EnrollmentsListPage } from '@/pages/EnrollmentsListPage'
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <EnrollmentsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

function req<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

describe('<EnrollmentsListPage /> — admin oversight by Sede → Course (ADR-0023)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('groups by Course and lets an admin approve a pending enrollment in place', async () => {
    useStore.getState().setRole('admin')
    const s = useStore.getState()
    const pending = req(
      s.enrollments.find((e) => e.status === 'pending'),
      'seed: no pending enrollment'
    )
    const student = req(
      s.students.find((st) => st.id === pending.studentId),
      'seed: pending enrollment student missing'
    )
    const course = req(
      s.courses.find((c) => c.id === pending.courseId),
      'seed: pending enrollment course missing'
    )
    renderPage()

    // The course card (grouped under its Sede) renders; the short display name can
    // recur across Sedes, so just assert at least one card shows it.
    expect((await screen.findAllByText(shortCourseName(course))).length).toBeGreaterThan(0)
    const approveButton = await screen.findByRole('button', {
      name: new RegExp(`approve ${student.firstName} ${student.lastName}'s enrollment`, 'i'),
    })
    fireEvent.click(approveButton)

    await waitFor(() => {
      const updated = useStore.getState().enrollments.find((e) => e.id === pending.id)
      expect(updated?.status).toBe('approved')
    })
  })

  it('windows each Sede→Course group so a large cohort never dumps every row (ADR-0026)', async () => {
    useStore.getState().setRole('admin')
    const { enrollments, students, courses } = useStore.getState()
    const studentIds = new Set(students.map((s) => s.id))
    const courseIds = new Set(courses.map((c) => c.id))
    // The default view shows every non-rejected enrollment whose student+course resolve.
    const active = enrollments.filter(
      (e) => e.status !== 'rejected' && studentIds.has(e.studentId) && courseIds.has(e.courseId)
    )
    const sizeByCourse = new Map<string, number>()
    for (const e of active) sizeByCourse.set(e.courseId, (sizeByCourse.get(e.courseId) ?? 0) + 1)
    const groupSizes = [...sizeByCourse.values()]
    // Guard: the seed must contain at least one cohort larger than a page.
    expect(groupSizes.some((n) => n > 10)).toBe(true)
    // Each group renders at most its page size; a row is a single <li>.
    const expectedRendered = groupSizes.reduce((sum, n) => sum + Math.min(n, 10), 0)
    expect(expectedRendered).toBeLessThan(active.length) // windowing actually drops rows

    renderPage()

    // Wait for the grouped list to render (action buttons present).
    await screen.findAllByRole('button', { name: /enrollment$/i })
    expect(screen.getAllByRole('listitem')).toHaveLength(expectedRendered)
    // At least one group needs a second page, so a pager is shown.
    expect(screen.getAllByText(/^Page 1 of [2-9]/).length).toBeGreaterThan(0)
  })

  it('hides rejected enrollments from the default view', async () => {
    useStore.getState().setRole('admin')
    const pending = req(
      useStore.getState().enrollments.find((e) => e.status === 'pending'),
      'seed: no pending enrollment'
    )
    // Turn one enrollment into a rejected record.
    useStore.getState().rejectEnrollment(pending.id)

    renderPage()

    // Wait until the grouped list has rendered its action buttons (data loaded).
    await screen.findAllByRole('button', { name: /enrollment$/i })
    // The default ('active') view excludes rejected rows, so no Rejected badge shows.
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument()
  })
})
