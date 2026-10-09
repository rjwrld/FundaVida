import { describe, it, expect } from 'vitest'
import { addDays, startOfDay, subDays } from 'date-fns'
import type { AttendanceRecord, Course } from '@/types'
import { buildAgenda } from '../agenda'

/**
 * Fixture clock: a Wednesday at noon. Courses are built relative to it so the
 * tests never decay (mirrors the Demo Epoch discipline, ADR-0002).
 */
const NOW = new Date(2026, 5, 17, 12, 0) // Wednesday, June 17 2026, local noon

/**
 * A Monday-only course whose term spans 2 weeks back and 2 weeks ahead of NOW:
 * past Mondays are Jun 8 + Jun 15 (recordable), upcoming are Jun 22 + Jun 29.
 */
function makeCourse(id: string, overrides: Partial<Course> = {}): Course {
  return {
    id,
    name: `Course ${id}`,
    description: '',
    sede: 'Hatillo',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: {
      start: startOfDay(subDays(NOW, 14)).toISOString(),
      end: startOfDay(addDays(NOW, 14)).toISOString(),
    },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAttendance(
  courseId: string,
  sessionDate: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord {
  return {
    id: `att-${courseId}-${sessionDate}`,
    courseId,
    studentId: 'stu-1',
    sessionDate,
    status: 'present',
    ...overrides,
  }
}

/** buildAgenda input with empty record lists; spread overrides per test. */
function baseInput(role: 'admin' | 'teacher', courses: Course[]) {
  return {
    role,
    courses,
    attendance: [] as AttendanceRecord[],
    now: NOW,
  }
}

describe('buildAgenda', () => {
  describe('teacher', () => {
    it('lists past unmarked sessions ascending, enriched with course name and sede', () => {
      const course = makeCourse('cou-1', { sede: 'Linda Vista' })
      const agenda = buildAgenda({ ...baseInput('teacher', [course]) })

      expect(agenda.role).toBe('teacher')
      if (agenda.role !== 'teacher') return
      // Past Mondays before NOW (Wed Jun 17): Jun 8 (ordinal 1) + Jun 15 (ordinal 2).
      expect(agenda.needsMarking).toHaveLength(2)
      expect(agenda.needsMarking.map((s) => s.ordinal)).toEqual([1, 2])
      const first = agenda.needsMarking[0]
      expect(first?.courseId).toBe('cou-1')
      expect(first?.courseName).toBe('Course cou-1')
      expect(first?.sede).toBe('Linda Vista')
      expect(first?.date).toBeTruthy()
    })

    it('groups the worklist by course: one row, a count, and the oldest-session deep link', () => {
      const course = makeCourse('cou-1', { sede: 'Linda Vista' })
      const agenda = buildAgenda(baseInput('teacher', [course]))
      if (agenda.role !== 'teacher') return

      expect(agenda.worklist).toHaveLength(1)
      const group = agenda.worklist[0]
      expect(group?.courseId).toBe('cou-1')
      expect(group?.count).toBe(2)
      // The oldest unmarked session (the first, ascending) is the deep-link target,
      // and the group carries its ordinal so a row can name it without re-scanning.
      expect(group?.oldestDate).toBe(agenda.needsMarking[0]?.date)
      expect(group?.oldestOrdinal).toBe(agenda.needsMarking[0]?.ordinal)
    })

    it('a session marked by any attendance record drops off the worklist', () => {
      const course = makeCourse('cou-1')
      const sessions = buildAgenda(baseInput('teacher', [course]))
      if (sessions.role !== 'teacher') return
      const firstDate = sessions.needsMarking[0]?.date ?? ''

      const agenda = buildAgenda({
        ...baseInput('teacher', [course]),
        attendance: [makeAttendance('cou-1', firstDate, { status: 'absent' })],
      })
      if (agenda.role !== 'teacher') return

      expect(agenda.needsMarking.map((s) => s.ordinal)).toEqual([2])
    })

    it('attendance for another course never marks this course’s sessions', () => {
      const course = makeCourse('cou-1')
      const probe = buildAgenda(baseInput('teacher', [course]))
      if (probe.role !== 'teacher') return
      const firstDate = probe.needsMarking[0]?.date ?? ''

      const agenda = buildAgenda({
        ...baseInput('teacher', [course]),
        attendance: [makeAttendance('cou-other', firstDate)],
      })
      if (agenda.role !== 'teacher') return

      expect(agenda.needsMarking).toHaveLength(2)
    })

    it('interleaves sessions from several courses in ascending date order', () => {
      // cou-tue meets Tuesdays: past Tuesdays are Jun 9 + Jun 16 — they
      // interleave with cou-mon's Jun 8 + Jun 15.
      const agenda = buildAgenda(
        baseInput('teacher', [
          makeCourse('cou-mon'),
          makeCourse('cou-tue', { meetingDays: ['tue'] }),
        ])
      )
      if (agenda.role !== 'teacher') return

      expect(agenda.needsMarking.map((s) => s.courseId)).toEqual([
        'cou-mon',
        'cou-tue',
        'cou-mon',
        'cou-tue',
      ])
    })

    it('also carries upcoming sessions', () => {
      const agenda = buildAgenda(baseInput('teacher', [makeCourse('cou-1')]))
      if (agenda.role !== 'teacher') return
      expect(agenda.upcoming.map((s) => s.ordinal)).toEqual([3, 4])
    })

    it('never lists an ended Course’s past unmarked sessions (active-only, ADR-0044)', () => {
      // A term-ended Course carries past unmarked Sessions, but that backlog is
      // close-readiness's business on the Courses page — the calendar worklist
      // shows only in-progress Courses (Term contains today). A startsSoon Course
      // has no past Sessions and is likewise absent.
      const ended = makeCourse('cou-ended', {
        term: {
          start: startOfDay(subDays(NOW, 21)).toISOString(),
          end: startOfDay(subDays(NOW, 7)).toISOString(),
        },
      })
      const live = makeCourse('cou-live')
      const agenda = buildAgenda(baseInput('teacher', [ended, live]))
      if (agenda.role !== 'teacher') return

      // Only cou-live's two past Mondays; none of cou-ended's.
      expect(agenda.needsMarking.every((s) => s.courseId === 'cou-live')).toBe(true)
      expect(agenda.needsMarking).toHaveLength(2)
    })
  })

  describe('admin', () => {
    it('summarizes the pulse: unmarked Sessions in in-progress Courses only, plus courses ready to close', () => {
      // cou-1 runs around NOW (in-progress): 2 past unmarked Mondays. cou-ended's
      // term is fully past (published + ended → ready to close) with 2 more past
      // unmarked Mondays — but those belong to close-readiness, not the calendar
      // pulse (ADR-0044), so the count is 2, not 4. The ended Course still counts
      // toward coursesToClose.
      const ended = makeCourse('cou-ended', {
        term: {
          start: startOfDay(subDays(NOW, 21)).toISOString(),
          end: startOfDay(subDays(NOW, 7)).toISOString(),
        },
      })
      const agenda = buildAgenda(baseInput('admin', [makeCourse('cou-1'), ended]))

      expect(agenda.role).toBe('admin')
      if (agenda.role !== 'admin') return
      expect(agenda.pulse).toEqual({ unmarkedCount: 2, coursesToCloseCount: 1 })
    })

    it('marked sessions and non-closeable courses leave the pulse at zero', () => {
      const course = makeCourse('cou-1')
      const probe = buildAgenda(baseInput('teacher', [course]))
      const dates = probe.role === 'teacher' ? probe.needsMarking.map((s) => s.date) : []

      const agenda = buildAgenda({
        ...baseInput('admin', [course]),
        attendance: dates.map((d) => makeAttendance('cou-1', d)),
      })
      if (agenda.role !== 'admin') return

      // Term still running → not closeable; every past session marked.
      expect(agenda.pulse).toEqual({ unmarkedCount: 0, coursesToCloseCount: 0 })
    })

    it('a draft course past its term never counts as ready to close', () => {
      const draftEnded = makeCourse('cou-draft', {
        status: 'draft',
        term: {
          start: startOfDay(subDays(NOW, 21)).toISOString(),
          end: startOfDay(subDays(NOW, 7)).toISOString(),
        },
      })
      const agenda = buildAgenda(baseInput('admin', [draftEnded]))
      if (agenda.role !== 'admin') return

      expect(agenda.pulse.coursesToCloseCount).toBe(0)
    })
  })

  describe('degenerate inputs return empty buckets, never throw (mirrors sessionsFor)', () => {
    it('no courses at all', () => {
      const teacher = buildAgenda(baseInput('teacher', []))
      expect(teacher.upcoming).toEqual([])
      if (teacher.role === 'teacher') expect(teacher.needsMarking).toEqual([])

      const admin = buildAgenda(baseInput('admin', []))
      if (admin.role === 'admin') {
        expect(admin.pulse).toEqual({ unmarkedCount: 0, coursesToCloseCount: 0 })
      }
    })

    it('malformed and inverted terms derive nothing', () => {
      const malformed = makeCourse('cou-bad', {
        term: { start: 'not-a-date', end: 'also-not-a-date' },
      })
      const inverted = makeCourse('cou-inv', {
        term: {
          start: startOfDay(addDays(NOW, 7)).toISOString(),
          end: startOfDay(subDays(NOW, 7)).toISOString(),
        },
      })

      const agenda = buildAgenda({
        ...baseInput('teacher', [malformed, inverted]),
      })

      expect(agenda.upcoming).toEqual([])
      if (agenda.role === 'teacher') expect(agenda.needsMarking).toEqual([])
    })

    it('a course with no meeting days contributes no sessions', () => {
      const agenda = buildAgenda(baseInput('teacher', [makeCourse('cou-1', { meetingDays: [] })]))

      expect(agenda.upcoming).toEqual([])
      if (agenda.role === 'teacher') expect(agenda.needsMarking).toEqual([])
    })
  })
})
