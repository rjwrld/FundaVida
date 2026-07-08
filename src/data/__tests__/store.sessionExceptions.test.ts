import { describe, it, expect, beforeEach } from 'vitest'
import { startOfDay } from 'date-fns'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { setDemoEpoch } from '@/lib/clock'
import { effectiveSessions } from '@/lib/sessions'
import type { AttendanceRecord, Course, Teacher } from '@/types'

// Wed, March 4 2026 — "now". Course MWF Mar 2 – Mar 13:
//   past/today: Mon 2, Wed 4(today)   future: Fri 6, Mon 9, Wed 11, Fri 13
const EPOCH = startOfDay(new Date(2026, 2, 4))
const iso = (y: number, m: number, d: number) => startOfDay(new Date(y, m, d)).toISOString()

const teacher: Teacher = {
  id: 'tea-1',
  firstName: 'Tea',
  lastName: 'One',
  email: 't1@fundavida.es',
  sede: 'Linda Vista',
  province: 'San José',
  canton: 'Central',
  courseIds: ['cou-1'],
  createdAt: '2026-01-01T00:00:00Z',
}

const course: Course = {
  id: 'cou-1',
  name: 'Math 101',
  description: 'Calculus',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-1',
  term: { start: iso(2026, 2, 2), end: iso(2026, 2, 13) },
  meetingDays: ['mon', 'wed', 'fri'],
  createdAt: '2026-01-01T00:00:00Z',
}

function seedControlled(over: { attendance?: AttendanceRecord[] } = {}) {
  setDemoEpoch(EPOCH.toISOString(), 0)
  useStore.setState({
    courses: [course],
    teachers: [teacher],
    sessionExceptions: [],
    announcements: [],
    attendance: over.attendance ?? [],
    auditLog: [],
    role: 'admin',
    currentUserId: 'admin',
  })
}

describe('createSessionException', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    seedControlled()
  })

  describe('happy path', () => {
    it('cancels a future session — it disappears from effectiveSessions', () => {
      const exc = useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'cancelled',
        date: iso(2026, 2, 6), // Fri 6, future
      })
      const state = useStore.getState()
      expect(state.sessionExceptions).toContainEqual(exc)
      expect(exc.id).toMatch(/^sxc-\d+$/)
      const eff = effectiveSessions(course, state.sessionExceptions)
      expect(eff.some((s) => s.date === iso(2026, 2, 6))).toBe(false)
      expect(eff).toHaveLength(5) // 6 base − 1 cancelled
    })

    it('reschedules a future session to a valid non-colliding date', () => {
      useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'rescheduled',
        date: iso(2026, 2, 9), // Mon 9
        newDate: iso(2026, 2, 10), // Tue 10 (not a meeting day, future)
      })
      const eff = effectiveSessions(course, useStore.getState().sessionExceptions)
      expect(eff.some((s) => s.date === iso(2026, 2, 9))).toBe(false)
      expect(eff.some((s) => s.date === iso(2026, 2, 10))).toBe(true)
      expect(eff).toHaveLength(6)
    })

    it('adds an extra session on a future non-meeting day', () => {
      useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'extra',
        date: iso(2026, 2, 7), // Sat 7, future
      })
      const eff = effectiveSessions(course, useStore.getState().sessionExceptions)
      expect(eff.some((s) => s.date === iso(2026, 2, 7))).toBe(true)
      expect(eff).toHaveLength(7)
    })

    it('records a `session` audit entry', () => {
      useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'cancelled',
        date: iso(2026, 2, 6),
      })
      const entry = useStore.getState().auditLog.find((e) => e.entity === 'session')
      expect(entry?.entity).toBe('session')
      expect(entry?.entityId).toBeDefined()
    })
  })

  // ADR-0040: a session change auto-posts a `sessionChange` Announcement in the
  // SAME store action — one mutation ⇒ exception + announcement + two audit
  // entries, never a second round-trip.
  describe('auto-posts a sessionChange announcement (ADR-0040)', () => {
    it('adds one announcement to the course feed on cancel', () => {
      const before = useStore.getState().announcements.length
      useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'cancelled',
        date: iso(2026, 2, 6),
      })
      const anns = useStore.getState().announcements
      expect(anns).toHaveLength(before + 1)
      const posted = anns[anns.length - 1]
      expect(posted?.kind).toBe('sessionChange')
      expect(posted?.courseId).toBe('cou-1')
      expect(posted?.body.length).toBeGreaterThan(0)
    })

    it('writes BOTH a session and an announcement audit entry in the one mutation', () => {
      useStore.setState({ auditLog: [] })
      useStore.getState().createSessionException({
        courseId: 'cou-1',
        type: 'rescheduled',
        date: iso(2026, 2, 9),
        newDate: iso(2026, 2, 10),
      })
      const log = useStore.getState().auditLog
      expect(log.filter((e) => e.entity === 'session')).toHaveLength(1)
      expect(log.filter((e) => e.entity === 'announcement')).toHaveLength(1)
      // Distinct log ids — the second entry must not collide with the first.
      expect(new Set(log.map((e) => e.id)).size).toBe(log.length)
    })

    it('does not post when a guard throws (no exception ⇒ no announcement)', () => {
      const before = useStore.getState().announcements.length
      try {
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 2), // past — rejected
        })
      } catch {
        /* expected */
      }
      expect(useStore.getState().announcements).toHaveLength(before)
    })
  })

  describe('integrity guards (throw before mutating)', () => {
    it('rejects an unknown course', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'nope',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).toThrow()
    })

    it('rejects cancelling a past session', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 2), // Mon 2, past
        })
      ).toThrow(/past|occurred/i)
    })

    it("rejects cancelling today's session", () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 4), // today
        })
      ).toThrow()
    })

    it('rejects a date that names no base session', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 7), // Sat, not a meeting day
        })
      ).toThrow()
    })

    it('rejects cancelling a session that already has recorded attendance', () => {
      // Contrive an attendance record on a future session date (guarded elsewhere,
      // but the immutability check must still fire).
      seedControlled({
        attendance: [
          {
            id: 'att-1',
            courseId: 'cou-1',
            studentId: 'stu-1',
            sessionDate: iso(2026, 2, 6),
            status: 'present',
          },
        ],
      })
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).toThrow(/attendance/i)
    })

    it('rejects a reschedule whose newDate is in the past', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'rescheduled',
          date: iso(2026, 2, 6),
          newDate: iso(2026, 2, 2), // past
        })
      ).toThrow()
    })

    it('rejects a reschedule that collides with another effective session', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'rescheduled',
          date: iso(2026, 2, 6), // Fri 6
          newDate: iso(2026, 2, 9), // Mon 9 — already a session
        })
      ).toThrow(/collide|exist/i)
    })

    it('rejects an extra date that collides with an existing session', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'extra',
          date: iso(2026, 2, 9), // Mon 9 — already a session
        })
      ).toThrow(/collide|exist/i)
    })

    it('rejects any exception on a closed course (terminal schedule, ADR-0024)', () => {
      useStore.setState({ courses: [{ ...course, status: 'closed' }] })
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).toThrow(/closed/i)
    })

    it('rejects an extra date in the past', () => {
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'extra',
          date: iso(2026, 2, 3), // Tue 3, past
        })
      ).toThrow()
    })

    it('leaves state untouched when a guard throws', () => {
      const before = useStore.getState().sessionExceptions
      try {
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 2),
        })
      } catch {
        /* expected */
      }
      expect(useStore.getState().sessionExceptions).toBe(before)
    })
  })

  describe('permissions (ADR-0009 throw-on-violation)', () => {
    it('lets the owning teacher create an exception on their own course', () => {
      useStore.setState({ role: 'teacher', currentUserId: 'tea-1' })
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).not.toThrow()
    })

    it('rejects a teacher who does not own the course', () => {
      useStore.setState({ role: 'teacher', currentUserId: 'tea-2' })
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).toThrow(/permission/i)
    })

    it('rejects a student', () => {
      useStore.setState({ role: 'student', currentUserId: 'stu-1' })
      expect(() =>
        useStore.getState().createSessionException({
          courseId: 'cou-1',
          type: 'cancelled',
          date: iso(2026, 2, 6),
        })
      ).toThrow(/permission/i)
    })
  })
})
