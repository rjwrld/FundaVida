import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/lib/i18n'
import { CalendarPage } from '@/pages/CalendarPage'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Course, Enrollment, TcuTrainee, Weekday } from '@/types'

// Fixed Demo Epoch (ADR-0014) so the week agenda opens on a known Mon-Sun week.
const NOW = new Date(2026, 5, 15) // Monday, June 15, 2026

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

// In scope for stu-1 (enrolled) and tea-1 (teaches it). Meets Mon/Wed in June.
const courseA: Course = {
  id: 'cou-A',
  name: 'Matemáticas',
  description: '',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-1',
  term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 30) },
  meetingDays: ['mon', 'wed'] as Weekday[],
  createdAt: isoDay(2026, 4, 1),
}

// Out of scope for stu-1 (not enrolled) and tea-1 (taught by tea-2). Meets Tue/Thu.
const courseB: Course = {
  id: 'cou-B',
  name: 'Historia',
  description: '',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-2',
  term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 30) },
  meetingDays: ['tue', 'thu'] as Weekday[],
  createdAt: isoDay(2026, 4, 1),
}

const enrollmentStu1A: Enrollment = {
  id: 'enr-1',
  studentId: 'stu-1',
  courseId: 'cou-A',
  enrolledAt: isoDay(2026, 4, 20),
  status: 'approved',
  requestedAt: isoDay(2026, 4, 20),
}

// tcu-1 is the tcu persona's userId; its courseId assigns it to courseA (ADR-0036).
const traineeTcu1A: TcuTrainee = {
  id: 'tcu-1',
  firstName: 'Vera',
  lastName: 'Núñez',
  email: 'vera@u.cr',
  sede: 'Linda Vista',
  university: 'Universidad de Costa Rica',
  courseId: 'cou-A',
  createdAt: isoDay(2026, 3, 1),
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter>
            <CalendarPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<CalendarPage />', () => {
  beforeEach(() => {
    setDemoEpoch(NOW)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.setState({
      courses: [courseA, courseB],
      enrollments: [enrollmentStu1A],
      tcuTrainees: [traineeTcu1A],
    })
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a student only their enrolled course’s sessions, read-only', async () => {
    useStore.getState().setRole('student')
    renderPage()

    // Matemáticas (Mon/Wed) has 2 sessions in the week of June 15; Historia never appears.
    const cards = await screen.findAllByText('Matemáticas')
    expect(cards.length).toBeGreaterThan(0)
    expect(screen.queryByText('Historia')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Matemáticas/ })).not.toBeInTheDocument()
  })

  it('shows a teacher only their taught course’s sessions, linked into Mark Attendance', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    const links = await screen.findAllByRole('link', { name: /Matemáticas/ })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
    })
    expect(screen.queryByText('Historia')).not.toBeInTheDocument()
  })

  it('lights up for a tcu volunteer with their assigned course’s sessions, read-only (ADR-0036)', async () => {
    useStore.getState().setRole('tcu')
    renderPage()

    const cards = await screen.findAllByText('Matemáticas')
    expect(cards.length).toBeGreaterThan(0)
    expect(screen.queryByText('Historia')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Matemáticas/ })).not.toBeInTheDocument()
  })

  it('shows an admin every course’s sessions in the week canvas', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    expect((await screen.findAllByText('Matemáticas')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Historia').length).toBeGreaterThan(0)
  })

  it('shows the teacher a needs-marking worklist in the sidebar', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Needs marking' })).toBeInTheDocument()
  })

  // The agenda sidebar is a marker's worklist (ADR-0051): a student or a TCU
  // volunteer has nothing to mark, so their canvas runs the full width.
  it.each(['student', 'tcu'] as const)(
    'gives a %s the canvas alone, no agenda sidebar',
    async (role) => {
      useStore.getState().setRole(role)
      renderPage()

      expect((await screen.findAllByText('Matemáticas')).length).toBeGreaterThan(0)
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Upcoming' })).not.toBeInTheDocument()
    }
  )

  it.each(['teacher', 'admin'] as const)('keeps the agenda sidebar for a %s', async (role) => {
    useStore.getState().setRole(role)
    renderPage()

    expect(await screen.findByRole('complementary')).toBeInTheDocument()
  })

  it('toggles to month mode, reusing MonthNavigator', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await screen.findAllByText('Matemáticas')
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))

    // MonthNavigator renders a month heading like "June 2026".
    expect(screen.getByText('June 2026')).toBeInTheDocument()
  })

  it('tapping a day in month mode navigates the week canvas to that week (ADR-0044)', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await screen.findAllByText('Matemáticas')
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    // Month is a navigator: no day-detail panel below the grid anymore.
    expect(screen.queryByRole('heading', { name: 'Sessions' })).not.toBeInTheDocument()

    // Tapping a day swaps to Week view positioned on that week.
    fireEvent.click(screen.getByRole('button', { name: /Monday, June 15th, 2026/ }))
    expect(screen.queryByText('June 2026')).not.toBeInTheDocument()
    expect((await screen.findAllByText('Matemáticas')).length).toBeGreaterThan(0)
    // The week canvas's navigation is back (Today / prev / next).
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
  })

  it('reads the month as a term map: the scoped cohorts’ milestones (ADR-0048)', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await screen.findAllByText('Matemáticas')
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))

    // The "This month" list narrates the student's own cohort boundaries…
    expect(screen.getByRole('heading', { name: 'This month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matemáticas · starts Jun 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matemáticas · ends Jun 30' })).toBeInTheDocument()
    // …and never Historia's: the term map rides the existing Courses scope.
    expect(screen.queryByRole('button', { name: /Historia/ })).not.toBeInTheDocument()
  })

  it('a milestone row is the same navigator move a day tap is', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await screen.findAllByText('Matemáticas')
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Matemáticas · starts Jun 1' }))

    // Back on the week canvas, landed on the week of June 1 (Mon Jun 1 – Fri Jun 5).
    expect(screen.queryByText('June 2026')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('points somewhere from a month the term map never touches', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await screen.findAllByText('Matemáticas')
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    // August 2026: cou-A ended in June, so the month is quiet — but not a dead end.
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(screen.getByText('No milestones this month.')).toBeInTheDocument()
    expect(screen.getByText(/Previous: Matemáticas · ends Jun 30/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jump to that week/ })).toBeInTheDocument()
  })

  it('shows an empty state when the viewer has no scoped courses', async () => {
    useStore.getState().setRole('student')
    useStore.setState({ courses: [courseB], enrollments: [] })
    renderPage()

    expect(await screen.findByText(/No courses yet/)).toBeInTheDocument()
  })
})
