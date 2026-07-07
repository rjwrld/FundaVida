import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { SessionCard } from '../SessionCard'
import type { Course, Weekday } from '@/types'

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

function renderCard(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<SessionCard />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('renders the short course title (Program + Level) and Sede · Session N meta', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="none"
      />
    )

    expect(screen.getByText('Matemáticas Primaria (jun)')).toBeInTheDocument()
    expect(screen.getByText(/Linda Vista/)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
  })

  it('shows a success badge for a present session', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="present"
      />
    )
    expect(screen.getByText('Present')).toBeInTheDocument()
  })

  it('shows a destructive badge for an absent session', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="absent"
      />
    )
    expect(screen.getByText('Absent')).toBeInTheDocument()
  })

  it('shows an info badge for an excused session', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="excused"
      />
    )
    expect(screen.getByText('Excused')).toBeInTheDocument()
  })

  it('shows a mono "needs marking" chip for a past unmarked session', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="needsMarking"
        linkToMark
      />
    )
    expect(screen.getByText('Needs marking')).toBeInTheDocument()
  })

  it('links a teacher/admin card to Mark Attendance when linkToMark is true', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="needsMarking"
        linkToMark
      />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
  })

  it('renders no link for a read-only student/tcu card', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="present"
        linkToMark={false}
      />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
