import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import { RoleCalendar } from '../RoleCalendar'
import type { Course, Weekday } from '@/types'

// Fixed Demo Epoch (ADR-0014) so the calendar opens on a known month with known
// session days and selects the frozen today (June 15) on mount.
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
    level: 'both',
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
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<RoleCalendar />', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    setDemoEpoch(NOW)
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks each session day of its courses with an event dot', () => {
    // June 2026: a mon/wed course meets Mon 1, Wed 3, Mon 8, ... — but never Tue 2.
    renderCalendar(<RoleCalendar courses={[makeCourse()]} linkSessions={false} />)

    expect(screen.getByRole('button', { name: /Monday, June 1, 2026/ })).toHaveAttribute(
      'data-has-event',
      'true'
    )
    expect(screen.getByRole('button', { name: /Wednesday, June 3, 2026/ })).toHaveAttribute(
      'data-has-event',
      'true'
    )
    expect(screen.getByRole('button', { name: /Tuesday, June 2, 2026/ })).toHaveAttribute(
      'data-has-event',
      'false'
    )
  })

  it('opens a panel listing the clicked day’s sessions as course name + ordinal', () => {
    renderCalendar(<RoleCalendar courses={[makeCourse()]} linkSessions={false} />)

    // June 17 is the 6th mon/wed session of the June term.
    fireEvent.click(screen.getByRole('button', { name: /Wednesday, June 17, 2026/ }))

    expect(screen.getByText('Matemáticas — Session 6')).toBeInTheDocument()
  })

  it('shows no session entries for a day with no sessions', () => {
    renderCalendar(<RoleCalendar courses={[makeCourse()]} linkSessions={false} />)

    // Tuesday June 16 is not a mon/wed meeting day → no session.
    fireEvent.click(screen.getByRole('button', { name: /Tuesday, June 16, 2026/ }))

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText('No sessions on this day.')).toBeInTheDocument()
  })

  it('links each entry into its course’s attendance when linkSessions is true', () => {
    // June 15 (today) is the 5th mon/wed session and is selected on mount.
    renderCalendar(<RoleCalendar courses={[makeCourse()]} linkSessions={true} />)

    const link = screen.getByRole('link', { name: 'Matemáticas — Session 5' })
    expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
  })

  it('renders read-only entries (no link) when linkSessions is false', () => {
    renderCalendar(<RoleCalendar courses={[makeCourse()]} linkSessions={false} />)

    expect(screen.queryByRole('link', { name: /Matemáticas/ })).not.toBeInTheDocument()
    expect(screen.getByText('Matemáticas — Session 5')).toBeInTheDocument()
  })
})
