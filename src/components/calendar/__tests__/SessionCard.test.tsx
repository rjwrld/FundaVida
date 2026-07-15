import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
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
      <TooltipProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </TooltipProvider>
    </I18nProvider>
  )
}

describe('<SessionCard />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('renders the de-suffixed card title (no cohort suffix) and Sede · Session n/total meta', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 7 }}
        status="none"
        total={16}
      />
    )

    // Card title drops both the Sede and the "(jun)" cohort suffix.
    expect(screen.getByText('Matemáticas Primaria')).toBeInTheDocument()
    expect(screen.getByText(/Linda Vista/)).toBeInTheDocument()
    // Meta shows the "n/total" fraction.
    expect(screen.getByText('7/16')).toBeInTheDocument()
  })

  it('keeps the full canonical name in the tooltip / accessible name', async () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="needsMarking"
        linkToMark
      />
    )
    const link = screen.getByRole('link', { name: 'Matemáticas Primaria — Linda Vista (jun)' })
    // The native `title=""` is gone — the full name now hangs off ui/tooltip.
    expect(link).not.toHaveAttribute('title')

    await userEvent.hover(link)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Matemáticas Primaria — Linda Vista (jun)'
    )
  })

  it('renders a student’s present verdict as one word, not a badge', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="present"
      />
    )
    expect(screen.getByText('Present')).toBeInTheDocument()
  })

  it('renders an absent verdict word', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="absent"
      />
    )
    expect(screen.getByText('Absent')).toBeInTheDocument()
  })

  it('renders an excused verdict word', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="excused"
      />
    )
    expect(screen.getByText('Excused')).toBeInTheDocument()
  })

  it('shows a "Mark attendance" action row for a past unmarked teacher/admin session', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="needsMarking"
        linkToMark
      />
    )
    expect(screen.getByText('Mark attendance')).toBeInTheDocument()
  })

  it('carries no action row on a marked-past or future teacher/admin card', () => {
    renderCard(
      <SessionCard
        course={makeCourse()}
        session={{ courseId: 'cou-A', date: isoDay(2026, 5, 1), ordinal: 1 }}
        status="none"
        linkToMark
        time="future"
      />
    )
    expect(screen.queryByText('Mark attendance')).not.toBeInTheDocument()
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
