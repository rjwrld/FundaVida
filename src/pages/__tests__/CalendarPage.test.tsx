import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { CalendarPage } from '@/pages/CalendarPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Course, Enrollment, Weekday } from '@/types'

// Fixed "now" so the calendar opens on June 2026 with deterministic session days.
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
  programName: 'Matemáticas',
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
  programName: 'Historia',
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
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CalendarPage />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<CalendarPage />', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.setState({ courses: [courseA, courseB], enrollments: [enrollmentStu1A] })
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a student only their enrolled courses’ sessions, read-only', () => {
    useStore.getState().setRole('student')
    renderPage()

    // June 15 (today, a Mon/Wed session) is selected on mount → Matemáticas Session 5.
    expect(screen.getByText('Matemáticas — Session 5')).toBeInTheDocument()
    // Read-only: a student's entry is not a link.
    expect(screen.queryByRole('link', { name: /Matemáticas/ })).not.toBeInTheDocument()
  })

  it('never shows a session outside the student’s scope', () => {
    useStore.getState().setRole('student')
    renderPage()

    // Historia (cou-B) is not enrolled → never rendered, anywhere.
    expect(screen.queryByText(/Historia/)).not.toBeInTheDocument()

    // A cou-B-only day carries no event dot for the student...
    const tue = screen.getByRole('button', { name: /Tuesday, June 16, 2026/ })
    expect(tue).toHaveAttribute('data-has-event', 'false')

    // ...and selecting it lists nothing, never the out-of-scope Historia session.
    fireEvent.click(tue)
    expect(screen.getByText('No sessions on this day.')).toBeInTheDocument()
    expect(screen.queryByText(/Historia/)).not.toBeInTheDocument()
  })

  it('shows a teacher only their taught courses’ sessions, linked into the session', () => {
    useStore.getState().setRole('teacher')
    renderPage()

    const link = screen.getByRole('link', { name: 'Matemáticas — Session 5' })
    expect(link).toHaveAttribute('href', '/app/attendance?courseId=cou-A')
    // Historia is taught by tea-2 → out of the teacher persona's scope.
    expect(screen.queryByText(/Historia/)).not.toBeInTheDocument()
  })

  it('shows an admin every course’s sessions', () => {
    useStore.getState().setRole('admin')
    renderPage()

    // Matemáticas on June 15 (Mon).
    expect(screen.getByText(/Matemáticas — Session 5/)).toBeInTheDocument()
    // Historia on a Tue/Thu day is visible to the admin.
    fireEvent.click(screen.getByRole('button', { name: /Tuesday, June 16, 2026/ }))
    expect(screen.getByText(/Historia — Session 5/)).toBeInTheDocument()
  })
})
