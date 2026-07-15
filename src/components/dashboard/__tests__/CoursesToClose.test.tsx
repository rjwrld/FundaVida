import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch, clock } from '@/lib/clock'
import { coursesToClose } from '@/lib/dashboard'
import { sessionsFor } from '@/lib/sessions'
import { useStore } from '@/data/store'
import type { AttendanceRecord, Grade } from '@/types'
import { CoursesToClose } from '../CoursesToClose'

// Clock pinned to the seed epoch (src/test/setup.ts) so Term boundaries in the
// seeded store line up with `clock.now()`.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CoursesToClose />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('CoursesToClose', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
  })

  it('lists published, Term-ended courses as links to their close flow, and omits closed ones', async () => {
    const courses = useStore.getState().courses
    const now = clock.now()
    const eligible = courses.find((c) => c.status === 'published' && parseISO(c.term.end) < now)
    const closed = courses.find((c) => c.status === 'closed')
    if (!eligible || !closed) throw new Error('seed should contain a closeable and a closed course')

    renderCard()

    const nameEl = await screen.findByText(eligible.name)
    expect(nameEl.closest('a')).toHaveAttribute('href', `/app/courses/${eligible.id}`)
    // A course that is already closed is not on the worklist.
    expect(screen.queryByText(closed.name)).not.toBeInTheDocument()
  })

  it('marks every closeable course blocked with the seeded store (readiness indicator)', async () => {
    const closeable = coursesToClose(useStore.getState().courses, clock.now())
    if (closeable.length === 0) throw new Error('seed should contain closeable courses')

    renderCard()

    // Indicators land only after the secondary queries (enrollments/grades/
    // attendance) resolve — findBy*, never sync getBy* (known CI-flake class).
    const indicators = await screen.findAllByTestId('close-readiness-indicator')
    expect(indicators).toHaveLength(closeable.length)
    // Current seed covers attendance for only the last 10 sessions per
    // enrollment, so every closeable course derives blocked.
    for (const indicator of indicators) {
      expect(indicator).toHaveTextContent('Blocked')
    }
  })

  it('marks a fully graded + fully recorded course ready while others stay blocked', async () => {
    const state = useStore.getState()
    const closeable = coursesToClose(state.courses, clock.now())
    const target = closeable[0]
    if (!target || closeable.length < 2)
      throw new Error('seed should contain at least two closeable courses')

    // Give the target full coverage: a Grade for every approved Student and an
    // AttendanceRecord for every derived session.
    const approvedIds = state.enrollments
      .filter((e) => e.courseId === target.id && e.status === 'approved')
      .map((e) => e.studentId)
    const extraGrades: Grade[] = approvedIds.map((studentId, i) => ({
      id: `grade-test-${i}`,
      studentId,
      courseId: target.id,
      score: 85,
      issuedAt: clock.now().toISOString(),
    }))
    const extraAttendance: AttendanceRecord[] = sessionsFor(target).map((session, i) => ({
      id: `att-test-${i}`,
      courseId: target.id,
      studentId: approvedIds[0] ?? 'stu-1',
      sessionDate: session.date,
      status: 'present' as const,
    }))
    const original = { grades: state.grades, attendance: state.attendance }
    useStore.setState({
      grades: [...state.grades, ...extraGrades],
      attendance: [...state.attendance, ...extraAttendance],
    })
    try {
      renderCard()

      const targetRow = (await screen.findByText(target.name)).closest('li')
      if (!targetRow) throw new Error('course row should be a list item')
      const targetIndicator = await within(targetRow).findByTestId('close-readiness-indicator')
      expect(targetIndicator).toHaveTextContent('Ready to close')

      // The other closeable courses keep their blockers.
      const indicators = await screen.findAllByTestId('close-readiness-indicator')
      const blocked = indicators.filter((el) => el.textContent?.includes('Blocked'))
      expect(blocked).toHaveLength(closeable.length - 1)
    } finally {
      useStore.setState(original)
    }
  })

  it('renders the indicator inside the row link, keeping the whole row navigable', async () => {
    const closeable = coursesToClose(useStore.getState().courses, clock.now())
    const target = closeable[0]
    if (!target) throw new Error('seed should contain closeable courses')

    renderCard()

    const link = (await screen.findByText(target.name)).closest('a')
    if (!link) throw new Error('course row should be a link')
    expect(link).toHaveAttribute('href', `/app/courses/${target.id}`)
    await within(link).findByTestId('close-readiness-indicator')
  })

  it('shows an all-clear empty state when nothing is ready to close', async () => {
    const original = useStore.getState().courses
    // Only closed / still-running / draft cohorts — none are closeable.
    useStore.setState({
      courses: original.map((c) => ({ ...c, status: 'closed' as const })),
    })
    try {
      renderCard()
      expect(await screen.findByText('No courses are ready to close.')).toBeInTheDocument()
    } finally {
      useStore.setState({ courses: original })
    }
  })
})
