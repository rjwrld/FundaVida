import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import userEvent from '@testing-library/user-event'
import { setDemoEpoch } from '@/lib/clock'
import { shortCourseName } from '@/lib/courseName'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { StudentCoursesTable } from '../StudentCoursesTable'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentCoursesTable />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<StudentCoursesTable /> — buildStudentProgress roll-up (ADR-0032/0043)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('student')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // The Card shell is a plain div (ADR-0047), so the named region the old
  // `<section aria-labelledby>` carried is restated on the Card. Pin it: a future
  // registry re-pull that drops the role/label would otherwise pass every gate.
  it('exposes the roll-up as a region named by its heading', async () => {
    renderTable()

    expect(await screen.findByRole('region', { name: 'My courses' })).toBeInTheDocument()
  })

  it('renders the per-course columns and deep-links each row to the Course', async () => {
    renderTable()

    // The table headers spell the roll-up: Course, status, attendance, grade,
    // certificate. The schedule column left for the certificate (ADR-0050) — the
    // meeting days live on the Course and the calendar.
    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual(['Course', 'Status', 'Attendance', 'Grade', 'Certificate'])

    // Each Course cell is a deep link into /app/courses/:id (scoped to the table
    // to dodge the DataTable dual-render mobile-card duplicate — getByRole trap).
    const links = within(table).getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/app\/courses\//))
  })

  it('holds a skeleton until the progress queries resolve — never flashes the empty state (ADR-0030)', async () => {
    // Hold enrollments open well past the other reads so an ungated table would
    // paint buildStudentProgress over an empty ([]) enrollments window and flash
    // the "not enrolled" empty state before the real rows arrive.
    const listEnrollments = api.enrollments.list
    vi.spyOn(api.enrollments, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listEnrollments(...args)
    })

    renderTable()

    // First synchronous paint: the gate is pending, so no empty state, no table.
    expect(screen.queryByText(/not enrolled in any courses/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    // Once resolved, the real rows arrive.
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('shows a designed empty state for a student with no enrollments', async () => {
    useStore.setState({ enrollments: [] })
    renderTable()

    expect(await screen.findByText(/not enrolled in any courses/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an issued certificate with its download, and a dash where there is none', async () => {
    const user = userEvent.setup()
    const { currentUserId, enrollments, courses, certificates } = useStore.getState()
    if (!currentUserId) throw new Error('the student persona should be signed in')
    const own = enrollments.filter((e) => e.studentId === currentUserId && e.status === 'approved')
    const [withCert, withoutCert] = own
    if (!withCert || !withoutCert) throw new Error('seed: the student needs two enrollments')
    const certCourse = courses.find((c) => c.id === withCert.courseId)
    const plainCourse = courses.find((c) => c.id === withoutCert.courseId)
    if (!certCourse || !plainCourse) throw new Error('seed: enrollment courses missing')
    useStore.setState({
      certificates: [
        ...certificates.filter((c) => c.studentId !== currentUserId),
        {
          id: 'cer-test',
          studentId: currentUserId,
          courseId: certCourse.id,
          score: 91,
          issuedAt: EPOCH.toISOString(),
        },
      ],
    })

    renderTable()

    const table = await screen.findByRole('table')
    const rowOf = (name: string) => {
      const row = within(table).getByRole('link', { name }).closest('tr')
      if (!row) throw new Error(`no row for ${name}`)
      return row
    }
    const certRow = rowOf(shortCourseName(certCourse))
    expect(within(certRow).getByText('Issued')).toBeInTheDocument()

    const plainCells = within(rowOf(shortCourseName(plainCourse))).getAllByRole('cell')
    expect(plainCells[plainCells.length - 1]).toHaveTextContent('—')

    // The download rides the existing preview dialog, whose footer saves the PDF.
    await user.click(
      within(certRow).getByRole('button', {
        name: `Download the ${shortCourseName(certCourse)} certificate`,
      })
    )
    expect(await screen.findByRole('dialog', { name: /certificate preview/i })).toBeInTheDocument()
  })
})
