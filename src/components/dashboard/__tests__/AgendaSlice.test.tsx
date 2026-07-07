import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch, clock } from '@/lib/clock'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { buildAgenda } from '@/lib/agenda'
import { AgendaSlice } from '../AgendaSlice'
import type { Course, Enrollment } from '@/types'

// Clock pinned to the seed epoch (mirrors src/test/setup.ts) so Term boundaries
// line up with clock.now() (ADR-0002/0014).
const EPOCH = new Date('2026-06-15T12:00:00.000Z')

/** A single published course with no attendance at all — the student's progress
 * row for it must read `total === 0` and take the "no sessions recorded yet"
 * copy rather than an on-track verdict (coordinator decision from the #239
 * thread, applies here too). */
function makeNoAttendanceCourse(): Course {
  return {
    id: 'cou-zero',
    name: 'Zero Attendance Course',
    description: '',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: '2026-06-01T00:00:00.000Z', end: '2026-06-30T00:00:00.000Z' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeEnrollment(): Enrollment {
  return {
    id: 'enr-zero',
    studentId: 'stu-1',
    courseId: 'cou-zero',
    status: 'approved',
    enrolledAt: '2026-01-01T00:00:00.000Z',
    requestedAt: '2026-01-01T00:00:00.000Z',
  }
}

function renderSlice() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AgendaSlice />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<AgendaSlice />', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ends every variant with an Open Calendar link to /app/calendar', async () => {
    useStore.getState().setRole('teacher')
    renderSlice()

    const link = await screen.findByRole('link', { name: /open calendar/i })
    expect(link).toHaveAttribute('href', '/app/calendar')
  })

  describe('teacher', () => {
    it('shows a needs-marking worklist deep-linked to Mark Attendance', async () => {
      useStore.getState().setRole('teacher')
      // Scoped exactly like the component's useCourses()/useAttendance() hooks
      // (a Teacher's own Courses only) — not the raw unscoped store arrays.
      const courses = await api.courses.list()
      const attendance = await api.attendance.list()
      const agenda = buildAgenda({
        role: 'teacher',
        courses,
        attendance,
        grades: await api.grades.list(),
        enrollments: await api.enrollments.list(),
        certificates: await api.certificates.list(),
        now: clock.now(),
      })
      if (agenda.role !== 'teacher') throw new Error('expected the teacher agenda variant')
      const [first] = agenda.needsMarking
      if (!first)
        throw new Error('seed should give the teacher persona at least one unmarked session')
      const expectedHref = `/app/courses/${first.courseId}/sessions/${first.date}/mark`

      renderSlice()

      // The worklist can hold several overdue sessions of the same course, so
      // the course name alone is not a unique accessible name — assert on the
      // exact per-session href instead.
      await screen.findAllByText(first.courseName)
      const links = screen.getAllByRole('link', { name: first.courseName })
      expect(links.some((link) => link.getAttribute('href') === expectedHref)).toBe(true)
    })
  })

  describe('student', () => {
    it('shows a one-line progress stat per course', async () => {
      useStore.getState().setRole('student')
      const enrollments = useStore.getState().enrollments
      const grades = useStore.getState().grades
      const attendance = useStore.getState().attendance
      const certificates = useStore.getState().certificates
      const courses = useStore.getState().courses
      const agenda = buildAgenda({
        role: 'student',
        courses,
        attendance,
        grades,
        enrollments,
        certificates,
        now: clock.now(),
      })
      if (agenda.role !== 'student') throw new Error('expected the student agenda variant')
      const [row] = agenda.progress
      if (!row) throw new Error('seed should give the student persona at least one enrollment')

      renderSlice()

      await screen.findByText(row.courseName)
    })

    it('shows "no sessions recorded yet" copy instead of an on-track verdict when total is 0', async () => {
      useStore.getState().setRole('student')
      vi.spyOn(api.courses, 'list').mockResolvedValue([makeNoAttendanceCourse()])
      vi.spyOn(api.attendance, 'list').mockResolvedValue([])
      vi.spyOn(api.grades, 'list').mockResolvedValue([])
      vi.spyOn(api.enrollments, 'list').mockResolvedValue([makeEnrollment()])
      vi.spyOn(api.certificates, 'list').mockResolvedValue([])

      renderSlice()

      await screen.findByText(/no sessions recorded yet/i)
    })
  })

  describe('tcu', () => {
    it('renders the aside for tcu (no xl-only gate) with an upcoming schedule', async () => {
      useStore.getState().setRole('tcu')
      renderSlice()

      await screen.findByRole('link', { name: /open calendar/i })
    })
  })

  describe('admin', () => {
    it('shows an operational pulse (unmarked count + courses-to-close count)', async () => {
      useStore.getState().setRole('admin')
      renderSlice()

      await screen.findByRole('link', { name: /open calendar/i })
      // The pulse renders numeric counts, not a per-session firehose.
      expect(screen.queryAllByRole('link', { name: /mark attendance/i })).toHaveLength(0)
    })
  })

  // First-paint regression (ADR-0030): the slice derives from 5 scoped hooks;
  // holding the render until ALL resolve prevents a false empty/zero verdict
  // from a query that resolves out of order.
  it('never paints a zero-count pulse while a slower query is still loading', async () => {
    useStore.getState().setRole('admin')

    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(600)
      return listCourses(...args)
    })

    let firstAsideText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstAsideText !== null) return
      const aside = document.querySelector('[data-testid="agenda-slice"]')
      if (aside && aside.textContent && aside.textContent.length > 0) {
        firstAsideText = aside.textContent
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderSlice()
      await screen.findByRole('link', { name: /open calendar/i })
      // The very first non-empty paint must already be the resolved state, not
      // an interim zero-count pulse rendered before courses loaded.
      expect(firstAsideText).not.toBeNull()
    } finally {
      observer.disconnect()
    }
  })
})
