import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { BrowseCoursesPage } from '@/pages/BrowseCoursesPage'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { COURSES_KEY } from '@/hooks/api/queryKeys'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage(client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })) {
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <BrowseCoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** The student persona's open Courses and their seats, read through the same seams. */
async function openCourses() {
  const courses = await api.courses.list({ scopeOverride: 'browseable', openOnly: true })
  return Promise.all(
    courses.map(async (course) => ({ course, seats: await api.courses.seatsRemaining(course.id) }))
  )
}

describe('<BrowseCoursesPage /> — the student Courses page (ADR-0043/0051)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('student')
  })

  it('lists each open Course as a link with the seats left', async () => {
    const open = await openCourses()
    expect(open.length).toBeGreaterThan(0)
    renderPage()
    // DataTable renders each row twice (table + mobile card, ADR-0026); read the table.
    const table = await screen.findByRole('table')

    for (const { course, seats } of open) {
      const link = within(table).getByRole('link', { name: course.name })
      expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
      const row = link.closest('tr')
      expect(row).not.toBeNull()
      if (row) expect(await within(row).findByText(`${seats} seats left`)).toBeInTheDocument()
    }
  })

  // Every open Course already matches the student's own Level (ADR-0016), and its
  // name already leads with the Program, so neither column carries information.
  it('drops the Level and Program columns', async () => {
    renderPage()
    await screen.findByRole('table')
    expect(screen.queryByRole('columnheader', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Program' })).not.toBeInTheDocument()
  })

  // One read for the whole list, not one fake-async call per row.
  it('reads every row’s seats in one batched call', async () => {
    const perRow = vi.spyOn(api.courses, 'seatsRemaining')
    const batched = vi.spyOn(api.courses, 'seatsRemainingFor')
    const open = await openCourses()
    perRow.mockClear()
    renderPage()

    const table = await screen.findByRole('table')
    const first = open[0]
    if (!first) throw new Error('seed has no open course for the student persona')
    expect(await within(table).findByText(`${first.seats} seats left`)).toBeInTheDocument()
    expect(batched).toHaveBeenCalledTimes(1)
    expect(perRow).not.toHaveBeenCalled()
  })

  // An approval writes the enrollments slice, whose write-set invalidates the
  // ['courses'] prefix (ADR-0029) — the batched seats read sits under it.
  it('refreshes the seats when an enrollment is approved', async () => {
    const [first] = await openCourses()
    if (!first) throw new Error('seed has no open course for the student persona')
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    renderPage(client)
    const table = await screen.findByRole('table')
    expect(await within(table).findByText(`${first.seats} seats left`)).toBeInTheDocument()

    // Another Student's pending request on that Course is approved by an admin.
    const s = useStore.getState()
    const other = s.students.find(
      (st) =>
        st.id !== s.currentUserId &&
        st.sede === first.course.sede &&
        st.educationalLevel === first.course.level &&
        !s.enrollments.some((e) => e.studentId === st.id && e.courseId === first.course.id)
    )
    if (!other) throw new Error('seed: no eligible student to enroll')
    useStore.setState({
      enrollments: [
        ...s.enrollments,
        {
          id: 'enr-seat-test',
          studentId: other.id,
          courseId: first.course.id,
          status: 'approved',
          requestedAt: new Date().toISOString(),
          enrolledAt: new Date().toISOString(),
        },
      ],
    })
    await client.invalidateQueries({ queryKey: COURSES_KEY })

    expect(await within(table).findByText(`${first.seats - 1} seats left`)).toBeInTheDocument()
  })

  it('reads the seats in Spanish too', async () => {
    useStore.getState().setLocale('es')
    const [first] = await openCourses()
    if (!first) throw new Error('seed has no open course for the student persona')
    renderPage()
    const table = await screen.findByRole('table')
    const link = within(table).getByRole('link', { name: first.course.name })
    const row = link.closest('tr')
    if (row)
      expect(await within(row).findByText(`Quedan ${first.seats} espacios`)).toBeInTheDocument()
  })

  // Requesting happens on the row (ADR-0051), through the same mutation, rule,
  // and invalidation as the Course page's Request button.
  describe('requesting from the row', () => {
    async function firstOpen() {
      const [first] = await openCourses()
      if (!first) throw new Error('seed has no open course for the student persona')
      return first
    }

    it('requests a spot, and the row stays to read Requested', async () => {
      const { course } = await firstOpen()
      const enrollmentsList = vi.spyOn(api.enrollments, 'list')
      const seatsRead = vi.spyOn(api.courses, 'seatsRemainingFor')
      const user = userEvent.setup()
      renderPage()
      const table = await screen.findByRole('table')
      const requestButton = () =>
        within(table).getByRole('button', { name: `Request a spot in ${course.name}` })
      // Held disabled until the seats read lands, so a full Course never flashes it.
      await waitFor(() => expect(requestButton()).toBeEnabled(), { timeout: 3000 })
      const enrollmentReads = enrollmentsList.mock.calls.length
      const seatReads = seatsRead.mock.calls.length

      await user.click(requestButton())

      await waitFor(() => {
        const mine = useStore
          .getState()
          .enrollments.find(
            (e) => e.courseId === course.id && e.studentId === useStore.getState().currentUserId
          )
        expect(mine?.status).toBe('pending')
      })
      const requested = await within(table).findByRole('button', { name: 'Requested' })
      expect(requested).toBeDisabled()
      expect(within(table).getByRole('link', { name: course.name })).toBeInTheDocument()
      // The request's write-set refreshed the student's enrollments and the seats.
      expect(enrollmentsList.mock.calls.length).toBeGreaterThan(enrollmentReads)
      expect(seatsRead.mock.calls.length).toBeGreaterThan(seatReads)
    })

    it('reads a course the student already requested as Requested', async () => {
      const { course } = await firstOpen()
      useStore.getState().requestEnrollment(useStore.getState().currentUserId ?? '', course.id)
      renderPage()

      const table = await screen.findByRole('table')
      expect(within(table).getByRole('link', { name: course.name })).toBeInTheDocument()
      expect(await within(table).findByRole('button', { name: 'Requested' })).toBeDisabled()
    })

    it('disables a course with no seats left as Full', async () => {
      const { course } = await firstOpen()
      const approved = useStore
        .getState()
        .enrollments.filter((e) => e.courseId === course.id && e.status === 'approved').length
      useStore.setState({
        courses: useStore
          .getState()
          .courses.map((c) => (c.id === course.id ? { ...c, capacity: approved } : c)),
      })
      renderPage()

      const table = await screen.findByRole('table')
      expect(await within(table).findByRole('button', { name: 'Full' })).toBeDisabled()
      expect(
        within(table).queryByRole('button', { name: `Request a spot in ${course.name}` })
      ).not.toBeInTheDocument()
    })

    it('offers the request in Spanish too', async () => {
      useStore.getState().setLocale('es')
      const { course } = await firstOpen()
      renderPage()

      const table = await screen.findByRole('table')
      expect(
        await within(table).findByRole('button', {
          name: `Solicitar un espacio en ${course.name}`,
        })
      ).toBeInTheDocument()
    })
  })
})
