import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { addDays, startOfDay } from 'date-fns'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import type { Course } from '@/types'
import { CourseStateBadge } from '../CourseStateBadge'

const termStart = startOfDay(new Date(2026, 5, 1)) // June 1, 2026
const termEnd = startOfDay(new Date(2026, 5, 30)) // June 30, 2026
const at = (d: Date) => new Date(d.getTime() + 12 * 60 * 60 * 1000)

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cou-1',
    name: 'Math 101',
    description: 'Calculus',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: termStart.toISOString(), end: termEnd.toISOString() },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderBadge(course: Course, now: Date) {
  return render(
    <I18nProvider>
      <CourseStateBadge course={course} now={now} data-testid="state-badge" />
    </I18nProvider>
  )
}

describe('<CourseStateBadge />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('renders Draft for a draft course', () => {
    renderBadge(makeCourse({ status: 'draft' }), at(addDays(termStart, 5)))
    expect(screen.getByTestId('state-badge')).toHaveTextContent('Draft')
  })

  it('renders Starts soon for a published course before its Term', () => {
    renderBadge(makeCourse({ status: 'published' }), at(addDays(termStart, -1)))
    expect(screen.getByTestId('state-badge')).toHaveTextContent('Starts soon')
  })

  it('renders In progress for a published course mid-Term', () => {
    renderBadge(makeCourse({ status: 'published' }), at(addDays(termStart, 5)))
    expect(screen.getByTestId('state-badge')).toHaveTextContent('In progress')
  })

  it('renders Term ended for a published course past its Term', () => {
    renderBadge(makeCourse({ status: 'published' }), at(addDays(termEnd, 1)))
    expect(screen.getByTestId('state-badge')).toHaveTextContent('Term ended')
  })

  it('renders Finished for a closed course', () => {
    renderBadge(makeCourse({ status: 'closed' }), at(addDays(termStart, 5)))
    expect(screen.getByTestId('state-badge')).toHaveTextContent('Finished')
  })
})
