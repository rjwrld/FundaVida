import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { clock, setDemoEpoch } from '@/lib/clock'
import { buildAgenda } from '@/lib/agenda'
import { shortCourseName } from '@/lib/courseName'
import { formatDate } from '@/lib/format'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { NeedsMarkingWorklist } from '../NeedsMarkingWorklist'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderWorklist() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NeedsMarkingWorklist />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<NeedsMarkingWorklist /> — teacher hero worklist (ADR-0043/0044)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('teacher')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds a skeleton until the three queries resolve — never flashes "nothing to mark" (ADR-0030)', async () => {
    // Hold attendance open past courses/exceptions so an ungated worklist would
    // read an empty ([]) attendance window and mark every Session as unmarked —
    // or, symmetrically, an empty courses window and flash the "caught up" empty
    // state. The gate holds all three until they resolve.
    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listAttendance(...args)
    })

    renderWorklist()

    // First synchronous paint: gate pending → the title is absent (skeleton only).
    expect(screen.queryByText(/needs marking/i)).not.toBeInTheDocument()

    // Once resolved, the real worklist (title) paints.
    expect(await screen.findByText(/needs marking/i)).toBeInTheDocument()
  })

  // The oldest unmarked Session per owned Course, derived the way the page does
  // over the acting teacher's own Courses — never a blind courses[0].
  function expectedRows() {
    const s = useStore.getState()
    const courses = s.courses.filter((c) => c.teacherId === s.currentUserId)
    const agenda = buildAgenda({
      role: 'teacher',
      courses,
      attendance: s.attendance,
      grades: [],
      enrollments: [],
      certificates: [],
      sessionExceptions: s.sessionExceptions,
      now: clock.now(),
    })
    if (agenda.role !== 'teacher') throw new Error('expected the teacher agenda')
    return agenda.worklist.map((group) => {
      const course = courses.find((c) => c.id === group.courseId)
      const oldest = agenda.needsMarking.find((x) => x.courseId === group.courseId)
      if (!course || !oldest) throw new Error(`worklist group ${group.courseId} has no Session`)
      return { course, oldest }
    })
  }

  it('lists one row per Course: the row links to the Course, the subtitle names the oldest Session', async () => {
    const rows = expectedRows()
    expect(rows.length, 'seed should leave the teacher persona something to mark').toBeGreaterThan(
      0
    )
    renderWorklist()

    const region = await screen.findByRole('region', { name: /needs marking/i })
    for (const { course, oldest } of rows) {
      const link = within(region).getByRole('link', { name: shortCourseName(course) })
      expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
      expect(
        within(region).getByText(`Session ${oldest.ordinal} · ${formatDate(oldest.date, 'en')}`)
      ).toBeInTheDocument()
    }
  })

  it('gives each overdue row exactly one action: Mark, onto the oldest unmarked Session', async () => {
    const rows = expectedRows()
    renderWorklist()

    const region = await screen.findByRole('region', { name: /needs marking/i })
    const marks = within(region).getAllByRole('link', { name: /^mark attendance:/i })
    expect(marks).toHaveLength(rows.length)
    for (const { course, oldest } of rows) {
      const mark = within(region).getByRole('link', {
        name: `Mark attendance: ${shortCourseName(course)}, ${formatDate(oldest.date, 'en')}, session ${oldest.ordinal}`,
      })
      expect(mark).toHaveAttribute('href', `/app/courses/${course.id}/sessions/${oldest.date}/mark`)
    }
  })
})
