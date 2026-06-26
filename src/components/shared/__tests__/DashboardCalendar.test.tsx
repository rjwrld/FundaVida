import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { DashboardCalendar } from '../DashboardCalendar'
import type { Course, Weekday } from '@/types'

// Fixed "now" so the calendar opens on a known month with known session days.
const NOW = new Date(2026, 5, 15) // Monday, June 15, 2026

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cou-A',
    name: 'Matemáticas',
    description: '',
    sede: 'Linda Vista',
    programName: 'Matemáticas',
    teacherId: 'tea-1',
    term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 30) },
    meetingDays: ['mon', 'wed'] as Weekday[],
    createdAt: isoDay(2026, 4, 1),
    ...overrides,
  }
}

function renderCalendar(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<DashboardCalendar />', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the clicked day’s sessions as course name + ordinal', () => {
    renderCalendar(<DashboardCalendar courses={[makeCourse()]} linkSessions={false} />)

    // June 17 is the 6th mon/wed session of the June term.
    fireEvent.click(screen.getByRole('button', { name: /Wednesday, June 17, 2026/ }))

    expect(screen.getByText('Matemáticas — Session 6')).toBeInTheDocument()
  })

  it('renders a student’s entries as read-only text (no link)', () => {
    // June 15 (today) is the 5th mon/wed session and is selected on mount.
    renderCalendar(<DashboardCalendar courses={[makeCourse()]} linkSessions={false} />)

    expect(screen.queryByRole('link', { name: /Matemáticas/ })).not.toBeInTheDocument()
    expect(screen.getByText('Matemáticas — Session 5')).toBeInTheDocument()
  })

  it('links a teacher/admin’s entries into the course’s attendance', () => {
    renderCalendar(<DashboardCalendar courses={[makeCourse()]} linkSessions={true} />)

    const link = screen.getByRole('link', { name: 'Matemáticas — Session 5' })
    expect(link).toHaveAttribute('href', '/app/attendance?courseId=cou-A')
  })
})
