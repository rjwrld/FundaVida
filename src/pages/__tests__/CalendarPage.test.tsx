import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/lib/i18n'
import { CalendarPage } from '@/pages/CalendarPage'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { AttendanceRecord, Course, Enrollment, TcuTrainee, Weekday } from '@/types'

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
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('shows the student "My progress" with no-sessions-yet copy when total is 0', async () => {
    useStore.getState().setRole('student')
    renderPage()

    expect(await screen.findByText('My progress')).toBeInTheDocument()
    // No AttendanceRecord seeded → total 0/0 → the coordinator's copy override.
    expect(screen.getByText('No sessions recorded yet')).toBeInTheDocument()
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

  it('shows an empty state when the viewer has no scoped courses', async () => {
    useStore.getState().setRole('student')
    useStore.setState({ courses: [courseB], enrollments: [] })
    renderPage()

    expect(await screen.findByText(/No courses yet/)).toBeInTheDocument()
  })

  // First-paint regression (ADR-0030): the student sidebar's progress bucket
  // reads enrollments + courses + grades + attendance + certificates. Holding
  // one of those queries open past the others must not let the sidebar paint
  // a false "no sessions recorded" or flash a wrong present/total count.
  it('never flashes the wrong progress verdict while a slower query resolves', async () => {
    useStore.getState().setRole('student')
    const attendanceRecords: AttendanceRecord[] = [
      {
        id: 'att-1',
        courseId: 'cou-A',
        studentId: 'stu-1',
        sessionDate: isoDay(2026, 5, 1),
        status: 'present',
      },
    ]
    useStore.setState({ attendance: attendanceRecords })

    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listAttendance(filters)
    })

    let firstSidebarText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstSidebarText !== null) return
      const heading = screen.queryByText('My progress')
      if (heading) firstSidebarText = heading.closest('section')?.textContent ?? null
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderPage()
      await screen.findByText('1/1 attended')
      // The FIRST frame "My progress" ever painted already carried the real count,
      // never a "no sessions recorded yet" placeholder computed off a [] default.
      expect(firstSidebarText).not.toBeNull()
      expect(firstSidebarText).not.toContain('No sessions recorded yet')
    } finally {
      observer.disconnect()
    }
  })
})
