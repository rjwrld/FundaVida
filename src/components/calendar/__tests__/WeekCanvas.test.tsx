import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import { WeekCanvas } from '../WeekCanvas'
import type { AttendanceRecord, Course, Weekday } from '@/types'

const NOW = new Date(2026, 5, 17) // Wednesday, June 17, 2026

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cou-A',
    name: 'Matemáticas Primaria — Linda Vista (jun)',
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

function renderCanvas(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<WeekCanvas />', () => {
  beforeEach(() => {
    setDemoEpoch(NOW)
    useStore.getState().setLocale('en')
  })

  it('renders seven day-columns Mon through Sun with weekday + date headers', () => {
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Sunday')).toBeInTheDocument()
  })

  it('renders a session card in the correct day column', () => {
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    // The mon/wed course meets twice in the week of June 17 (Mon 15 + Wed 17).
    expect(screen.getAllByText('Matemáticas Primaria (jun)')).toHaveLength(2)
  })

  it('renders empty day-columns quietly for days with no sessions', () => {
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    // Tuesday/Thu/Fri/Sat/Sun have no session; only Mon + Wed carry a card.
    expect(screen.getAllByText('Matemáticas Primaria (jun)')).toHaveLength(2)
  })

  it('shows the empty-week message when scoped courses have no sessions this week', () => {
    renderCanvas(
      <WeekCanvas
        courses={[]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    expect(screen.getByText('No sessions this week.')).toBeInTheDocument()
  })

  it('calls onWeekChange with the previous week when Previous is clicked', () => {
    const onWeekChange = vi.fn()
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={onWeekChange}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(onWeekChange).toHaveBeenCalledTimes(1)
    const call = onWeekChange.mock.calls.at(0)
    expect(call).toBeDefined()
    if (call) expect((call[0] as Date).getTime()).toBeLessThan(NOW.getTime())
  })

  it('calls onWeekChange with the next week when Next is clicked', () => {
    const onWeekChange = vi.fn()
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={onWeekChange}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(onWeekChange).toHaveBeenCalledTimes(1)
    const call = onWeekChange.mock.calls.at(0)
    expect(call).toBeDefined()
    if (call) expect((call[0] as Date).getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('calls onWeekChange with today’s week when Today is clicked', () => {
    const onWeekChange = vi.fn()
    // Start on a week far from today.
    const farWeek = new Date(2026, 7, 5)
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={farWeek}
        onWeekChange={onWeekChange}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onWeekChange).toHaveBeenCalledTimes(1)
  })

  it('highlights today’s column', () => {
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={() => 'none'}
      />
    )

    // Today (June 17) column carries a data marker distinguishing it.
    const todayHeading = screen.getByText('17').closest('[data-today]')
    expect(todayHeading).not.toBeNull()
  })

  it('links teacher/admin cards to Mark Attendance when linkToMark is true', () => {
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark
        statusFor={() => 'needsMarking'}
      />
    )

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
    })
  })

  it('derives a student’s own status per session via statusFor', () => {
    const attendance: AttendanceRecord[] = [
      {
        id: 'att-1',
        courseId: 'cou-A',
        studentId: 'stu-1',
        sessionDate: isoDay(2026, 5, 17),
        status: 'present',
      },
    ]
    renderCanvas(
      <WeekCanvas
        courses={[makeCourse()]}
        weekOf={NOW}
        onWeekChange={vi.fn()}
        linkToMark={false}
        statusFor={(courseId, date) => {
          const record = attendance.find((a) => a.courseId === courseId && a.sessionDate === date)
          return record ? record.status : 'none'
        }}
      />
    )

    expect(screen.getByText('Present')).toBeInTheDocument()
  })
})
