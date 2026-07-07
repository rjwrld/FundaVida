import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { CourseSessionsSection } from '@/components/courses/CourseSessionsSection'
import type { CloseReadiness } from '@/lib/closeReadiness'
import type { Session } from '@/lib/sessions'
import type { AttendanceRecord, Course } from '@/types'

// A fixed "today" at local noon so day-granularity comparisons never straddle a
// timezone midnight, and Session dates offset from it by whole days.
const TODAY = new Date(2026, 5, 15, 12, 0, 0)
function offsetDay(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const course: Course = {
  id: 'cou-x',
  name: 'Test Course',
  description: '',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 10,
  teacherId: 'tea-1',
  term: { start: offsetDay(-30), end: offsetDay(30) },
  meetingDays: ['mon'],
  createdAt: offsetDay(-40),
}

// Two past Sessions (one recorded, one not), today, and five upcoming.
const pastRecorded: Session = { courseId: course.id, date: offsetDay(-14), ordinal: 1 }
const pastUnrecorded: Session = { courseId: course.id, date: offsetDay(-7), ordinal: 2 }
const todaySession: Session = { courseId: course.id, date: offsetDay(0), ordinal: 3 }
const upcoming: Session[] = [1, 2, 3, 4, 5].map((n) => ({
  courseId: course.id,
  date: offsetDay(n),
  ordinal: 3 + n,
}))
const sessions: Session[] = [pastRecorded, pastUnrecorded, todaySession, ...upcoming]

// Attendance: three present + one absent on the recorded Session; none on the other.
const attendance: AttendanceRecord[] = [
  {
    id: 'a1',
    courseId: course.id,
    studentId: 's1',
    sessionDate: pastRecorded.date,
    status: 'present',
  },
  {
    id: 'a2',
    courseId: course.id,
    studentId: 's2',
    sessionDate: pastRecorded.date,
    status: 'present',
  },
  {
    id: 'a3',
    courseId: course.id,
    studentId: 's3',
    sessionDate: pastRecorded.date,
    status: 'present',
  },
  {
    id: 'a4',
    courseId: course.id,
    studentId: 's4',
    sessionDate: pastRecorded.date,
    status: 'absent',
  },
]

// The same closeReadiness verdict the checklist derives: pastUnrecorded is the
// only unrecorded past Session.
const readiness: CloseReadiness = {
  ungradedStudentIds: [],
  unrecordedSessions: [pastUnrecorded],
  ready: false,
}

function renderSection(props: Partial<React.ComponentProps<typeof CourseSessionsSection>> = {}) {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CourseSessionsSection
          course={course}
          sessions={sessions}
          today={TODAY}
          canMark
          readiness={readiness}
          attendance={attendance}
          enrolledCount={10}
          {...props}
        />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<CourseSessionsSection />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('groups a marker’s Sessions by state with a summary line', () => {
    renderSection()

    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument()
    // Summary counts the past recorded vs needs-attendance split at a glance.
    expect(screen.getByText('1 recorded · 1 need attendance')).toBeInTheDocument()

    // One named list per state group (a11y).
    expect(screen.getByRole('list', { name: 'Needs attendance' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Recorded' })).toBeInTheDocument()
  })

  it('puts the unrecorded past Session in the Needs-attendance queue with a "0/total recorded" state', () => {
    renderSection()

    const queue = screen.getByRole('list', { name: 'Needs attendance' })
    const row = within(queue).getByRole('listitem')
    expect(row).toHaveTextContent('Session 2 · ')
    // State conveyed in row text, never colour alone (a11y).
    expect(row).toHaveTextContent('0/10 recorded')
    // The action navigates to the dedicated marking page, fully named (a11y).
    const mark = within(row).getByRole('link', { name: /Mark attendance — Session 2 · / })
    expect(mark).toHaveAttribute(
      'href',
      `/app/courses/${course.id}/sessions/${pastUnrecorded.date}/mark`
    )
  })

  it('shows the recorded past Session its present-count and a Review action', () => {
    renderSection()

    const recorded = screen.getByRole('list', { name: 'Recorded' })
    const row = within(recorded).getByRole('listitem')
    expect(row).toHaveTextContent('Session 1 · ')
    expect(row).toHaveTextContent('3/10 present')
    const review = within(row).getByRole('link', { name: /Review — Session 1 · / })
    expect(review).toHaveAttribute(
      'href',
      `/app/courses/${course.id}/sessions/${pastRecorded.date}/mark`
    )
  })

  it('gives Today the primary mark action and no other', () => {
    renderSection()

    const today = screen.getByRole('list', { name: 'Today' })
    const row = within(today).getByRole('listitem')
    expect(row).toHaveTextContent('Session 3 · ')
    expect(
      within(row).getByRole('link', { name: /Mark attendance — Session 3 · / })
    ).toHaveAttribute('href', `/app/courses/${course.id}/sessions/${todaySession.date}/mark`)
  })

  it('collapses the Upcoming overflow behind a keyboard-native disclosure', () => {
    renderSection()

    const upcomingList = screen.getByRole('list', { name: 'Upcoming' })
    // Three rows visible, the remaining two behind a <details> disclosure.
    expect(screen.getByText('Show 2 more')).toBeInTheDocument()
    expect(within(upcomingList).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
  })

  it('renders a Student’s view with no verdicts and no actions', () => {
    renderSection({ canMark: false, readiness: null })

    // No verdict groups, no summary, no marking affordances.
    expect(screen.queryByText(/need attendance/)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Needs attendance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Recorded' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Mark attendance/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Review/ })).not.toBeInTheDocument()

    // Past Sessions render as a plain, read-only group.
    const past = screen.getByRole('list', { name: 'Past' })
    expect(within(past).getAllByRole('listitem').length).toBe(2)
    expect(screen.getByRole('list', { name: 'Upcoming' })).toBeInTheDocument()
  })

  it('holds the past groups while a marker’s attendance window is still loading (no false queue)', () => {
    // readiness null for a marker = the resolveQueries gate hasn’t resolved yet.
    renderSection({ readiness: null })

    // No false Needs-attendance flash and no premature Recorded group…
    expect(screen.queryByRole('list', { name: 'Needs attendance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Recorded' })).not.toBeInTheDocument()
    expect(screen.queryByText(/need attendance/)).not.toBeInTheDocument()
    // …but Today/Upcoming (pure date math) still render immediately.
    expect(screen.getByRole('list', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Upcoming' })).toBeInTheDocument()
  })

  it('shows the empty state when the Course derives no Sessions', () => {
    renderSection({ sessions: [] })
    expect(screen.getByText('No sessions scheduled for this course.')).toBeInTheDocument()
  })
})
