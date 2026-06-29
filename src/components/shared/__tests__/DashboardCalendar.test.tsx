import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 30) },
    meetingDays: ['mon', 'wed'] as Weekday[],
    createdAt: isoDay(2026, 4, 1),
    ...overrides,
  }
}

function renderCalendar(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>)
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

  it('marks the courses’ session days as calendar events', () => {
    // June 2026: a mon/wed course meets Mon 1, Wed 3, ... — but never Tue 2.
    renderCalendar(<DashboardCalendar courses={[makeCourse()]} />)

    expect(screen.getByRole('button', { name: /Monday, June 1, 2026/ })).toHaveAttribute(
      'data-has-event',
      'true'
    )
    expect(screen.getByRole('button', { name: /Tuesday, June 2, 2026/ })).toHaveAttribute(
      'data-has-event',
      'false'
    )
  })

  it('selects a day when it is clicked', () => {
    renderCalendar(<DashboardCalendar courses={[makeCourse()]} />)

    // June 16 is not today (June 15), so clicking it marks it selected.
    fireEvent.click(screen.getByRole('button', { name: /Tuesday, June 16, 2026/ }))

    expect(screen.getByRole('button', { name: /Tuesday, June 16, 2026/ })).toHaveAttribute(
      'data-selected',
      'true'
    )
  })
})
