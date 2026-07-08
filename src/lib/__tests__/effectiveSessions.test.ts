import { describe, it, expect } from 'vitest'
import { startOfDay, isSameDay, parseISO } from 'date-fns'
import { effectiveSessions, sessionsFor } from '../sessions'
import type { Course, SessionException } from '@/types/domain'

// MWF, Mar 2 – Mar 13 2026: Mon 2, Wed 4, Fri 6, Mon 9, Wed 11, Fri 13 (6 sessions)
const courseMWF: Course = {
  id: 'course-mwf',
  name: 'Math 101',
  description: 'Calculus',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'teacher-1',
  term: {
    start: startOfDay(new Date(2026, 2, 2)).toISOString(),
    end: startOfDay(new Date(2026, 2, 13)).toISOString(),
  },
  meetingDays: ['mon', 'wed', 'fri'],
  createdAt: '2026-01-01T00:00:00Z',
}

const iso = (y: number, m: number, d: number) => startOfDay(new Date(y, m, d)).toISOString()

const exception = (over: Partial<SessionException>): SessionException => ({
  id: 'exc-1',
  courseId: courseMWF.id,
  type: 'cancelled',
  date: iso(2026, 2, 4),
  createdAt: '2026-01-15T00:00:00Z',
  ...over,
})

/** The effective session list as (calendar-day, ordinal) pairs, ascending. */
const shape = (course: Course, exceptions: SessionException[]) =>
  effectiveSessions(course, exceptions).map((s) => ({
    day: startOfDay(parseISO(s.date)).getTime(),
    ordinal: s.ordinal,
  }))

describe('effectiveSessions', () => {
  it('with no exceptions is exactly sessionsFor (identity overlay)', () => {
    expect(effectiveSessions(courseMWF, [])).toEqual(sessionsFor(courseMWF))
  })

  it('ignores exceptions belonging to another course', () => {
    const other = exception({ courseId: 'course-other', date: iso(2026, 2, 4) })
    expect(effectiveSessions(courseMWF, [other])).toEqual(sessionsFor(courseMWF))
  })

  it('cancelled drops the named base session and renumbers the rest contiguously', () => {
    // Cancel Wed Mar 4 (the 2nd session). Remaining: Mon 2, Fri 6, Mon 9, Wed 11, Fri 13.
    const result = shape(courseMWF, [exception({ type: 'cancelled', date: iso(2026, 2, 4) })])
    expect(result).toEqual([
      { day: startOfDay(new Date(2026, 2, 2)).getTime(), ordinal: 1 },
      { day: startOfDay(new Date(2026, 2, 6)).getTime(), ordinal: 2 },
      { day: startOfDay(new Date(2026, 2, 9)).getTime(), ordinal: 3 },
      { day: startOfDay(new Date(2026, 2, 11)).getTime(), ordinal: 4 },
      { day: startOfDay(new Date(2026, 2, 13)).getTime(), ordinal: 5 },
    ])
  })

  it('cancelled matches its target same-day, ignoring time-of-day', () => {
    const noonCancel = exception({
      type: 'cancelled',
      date: new Date(2026, 2, 4, 13, 30).toISOString(),
    })
    expect(effectiveSessions(courseMWF, [noonCancel])).toHaveLength(5)
  })

  it('rescheduled moves the session to newDate, re-sorting into chronological order', () => {
    // Move Wed Mar 4 → Sat Mar 7 (not a meeting day). Order stays: 2,7,6? No —
    // 7 sorts after 6, so: Mon 2, Fri 6, Sat 7, Mon 9, Wed 11, Fri 13.
    const result = shape(courseMWF, [
      exception({ type: 'rescheduled', date: iso(2026, 2, 4), newDate: iso(2026, 2, 7) }),
    ])
    expect(result).toEqual([
      { day: startOfDay(new Date(2026, 2, 2)).getTime(), ordinal: 1 },
      { day: startOfDay(new Date(2026, 2, 6)).getTime(), ordinal: 2 },
      { day: startOfDay(new Date(2026, 2, 7)).getTime(), ordinal: 3 },
      { day: startOfDay(new Date(2026, 2, 9)).getTime(), ordinal: 4 },
      { day: startOfDay(new Date(2026, 2, 11)).getTime(), ordinal: 5 },
      { day: startOfDay(new Date(2026, 2, 13)).getTime(), ordinal: 6 },
    ])
  })

  it('rescheduled to a nearby date preserves the ordinal (ordinal stability)', () => {
    // Move Wed Mar 4 → Thu Mar 5: still the 2nd session chronologically.
    const result = effectiveSessions(courseMWF, [
      exception({ type: 'rescheduled', date: iso(2026, 2, 4), newDate: iso(2026, 2, 5) }),
    ])
    const moved = result.find((s) => isSameDay(parseISO(s.date), new Date(2026, 2, 5)))
    expect(moved?.ordinal).toBe(2)
    expect(result).toHaveLength(6)
  })

  it('extra inserts a new session on a non-meeting day, chronologically placed', () => {
    // Add Tue Mar 3 (not a meeting day). It slots between Mon 2 and Wed 4.
    const result = shape(courseMWF, [exception({ type: 'extra', date: iso(2026, 2, 3) })])
    expect(result).toEqual([
      { day: startOfDay(new Date(2026, 2, 2)).getTime(), ordinal: 1 },
      { day: startOfDay(new Date(2026, 2, 3)).getTime(), ordinal: 2 },
      { day: startOfDay(new Date(2026, 2, 4)).getTime(), ordinal: 3 },
      { day: startOfDay(new Date(2026, 2, 6)).getTime(), ordinal: 4 },
      { day: startOfDay(new Date(2026, 2, 9)).getTime(), ordinal: 5 },
      { day: startOfDay(new Date(2026, 2, 11)).getTime(), ordinal: 6 },
      { day: startOfDay(new Date(2026, 2, 13)).getTime(), ordinal: 7 },
    ])
  })

  it('composes multiple exceptions of different kinds', () => {
    // Cancel Mon 2, reschedule Wed 4 → Sat 7, add extra Sun 8.
    const result = shape(courseMWF, [
      exception({ id: 'e1', type: 'cancelled', date: iso(2026, 2, 2) }),
      exception({ id: 'e2', type: 'rescheduled', date: iso(2026, 2, 4), newDate: iso(2026, 2, 7) }),
      exception({ id: 'e3', type: 'extra', date: iso(2026, 2, 8) }),
    ])
    // Base minus Mon2, minus Wed4; plus Sat7, plus Sun8:
    // Fri 6, Sat 7, Sun 8, Mon 9, Wed 11, Fri 13.
    expect(result.map((r) => r.day)).toEqual([
      startOfDay(new Date(2026, 2, 6)).getTime(),
      startOfDay(new Date(2026, 2, 7)).getTime(),
      startOfDay(new Date(2026, 2, 8)).getTime(),
      startOfDay(new Date(2026, 2, 9)).getTime(),
      startOfDay(new Date(2026, 2, 11)).getTime(),
      startOfDay(new Date(2026, 2, 13)).getTime(),
    ])
    expect(result.map((r) => r.ordinal)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('is deterministic: two calls with the same inputs return identical date strings', () => {
    const exceptions = [
      exception({ type: 'rescheduled', date: iso(2026, 2, 4), newDate: iso(2026, 2, 7) }),
      exception({ id: 'e2', type: 'extra', date: iso(2026, 2, 8) }),
    ]
    expect(effectiveSessions(courseMWF, exceptions)).toEqual(
      effectiveSessions(courseMWF, exceptions)
    )
  })

  it('every effective session carries the course id', () => {
    const result = effectiveSessions(courseMWF, [
      exception({ type: 'extra', date: iso(2026, 2, 8) }),
    ])
    for (const s of result) expect(s.courseId).toBe(courseMWF.id)
  })

  it('a cancelled date that matches no base session is a no-op', () => {
    // Tue Mar 3 is never a base session for an MWF course.
    expect(
      effectiveSessions(courseMWF, [exception({ type: 'cancelled', date: iso(2026, 2, 3) })])
    ).toEqual(sessionsFor(courseMWF))
  })
})
