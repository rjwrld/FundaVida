import { describe, it, expect } from 'vitest'
import {
  sessionsFor,
  findSession,
  isSessionMarked,
  isSessionRecordable,
  isSessionUpcoming,
  upcomingSessions,
  type Session,
} from '../sessions'
import { type AttendanceRecord, type Course } from '@/types/domain'
import { addDays, startOfDay, isSameDay, parseISO } from 'date-fns'

describe('sessions', () => {
  // Build term bounds the proper way: startOfDay(local Date) → toISOString()
  const termStart = startOfDay(new Date(2026, 2, 2)) // Monday, March 2, 2026
  const termEnd = startOfDay(new Date(2026, 2, 8)) // Sunday, March 8, 2026

  const courseMWF: Course = {
    id: 'course-1',
    name: 'Math 101',
    description: 'Calculus',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'teacher-1',
    term: {
      start: termStart.toISOString(),
      end: termEnd.toISOString(),
    },
    meetingDays: ['mon', 'wed', 'fri'],
    createdAt: '2026-01-01T00:00:00Z',
  }

  describe('sessionsFor', () => {
    it('returns sessions for each meeting day within the term, in ascending order', () => {
      const sessions = sessionsFor(courseMWF)

      expect(sessions).toHaveLength(3) // Mon 2, Wed 4, Fri 6
      // Verify that the sessions are on the correct local calendar days.
      // Use isSameDay to check rather than UTC string comparison.
      const session0 = sessions.at(0)
      const session1 = sessions.at(1)
      const session2 = sessions.at(2)
      expect(session0).toBeDefined()
      expect(session1).toBeDefined()
      expect(session2).toBeDefined()
      if (session0) {
        expect(isSameDay(parseISO(session0.date), new Date(2026, 2, 2))).toBe(true)
        expect(session0.ordinal).toBe(1)
      }
      if (session1) {
        expect(isSameDay(parseISO(session1.date), new Date(2026, 2, 4))).toBe(true)
        expect(session1.ordinal).toBe(2)
      }
      if (session2) {
        expect(isSameDay(parseISO(session2.date), new Date(2026, 2, 6))).toBe(true)
        expect(session2.ordinal).toBe(3)
      }
    })

    it('includes both term boundaries when they match a meeting day', () => {
      // 2026-03-01 is Sunday, 2026-03-02 is Monday
      const course: Course = {
        ...courseMWF,
        term: {
          start: startOfDay(new Date(2026, 2, 2)).toISOString(), // Monday
          end: startOfDay(new Date(2026, 2, 6)).toISOString(), // Friday
        },
      }
      const sessions = sessionsFor(course)
      expect(sessions).toHaveLength(3)
      const first = sessions.at(0)
      const last = sessions.at(-1)
      expect(first).toBeDefined()
      expect(last).toBeDefined()
      if (first) {
        expect(isSameDay(parseISO(first.date), new Date(2026, 2, 2))).toBe(true)
      }
      if (last) {
        expect(isSameDay(parseISO(last.date), new Date(2026, 2, 6))).toBe(true)
      }
    })

    it('filters by meeting days correctly', () => {
      const monWedCourse: Course = {
        ...courseMWF,
        meetingDays: ['mon', 'wed'],
      }
      const sessions = sessionsFor(monWedCourse)
      expect(sessions).toHaveLength(2)
      const session0 = sessions.at(0)
      const session1 = sessions.at(1)
      expect(session0).toBeDefined()
      expect(session1).toBeDefined()
      if (session0) {
        expect(isSameDay(parseISO(session0.date), new Date(2026, 2, 2))).toBe(true) // Monday
      }
      if (session1) {
        expect(isSameDay(parseISO(session1.date), new Date(2026, 2, 4))).toBe(true) // Wednesday
      }
    })

    it('returns empty list when meetingDays is empty', () => {
      const noDaysCourse: Course = {
        ...courseMWF,
        meetingDays: [],
      }
      const sessions = sessionsFor(noDaysCourse)
      expect(sessions).toEqual([])
    })

    it('returns empty list when term.end is before term.start', () => {
      const invertedTermCourse: Course = {
        ...courseMWF,
        term: {
          start: startOfDay(new Date(2026, 2, 8)).toISOString(),
          end: startOfDay(new Date(2026, 2, 2)).toISOString(),
        },
      }
      const sessions = sessionsFor(invertedTermCourse)
      expect(sessions).toEqual([])
    })

    it('returns empty list when term dates are malformed', () => {
      const malformedTermCourse: Course = {
        ...courseMWF,
        term: {
          start: 'not-a-date',
          end: startOfDay(new Date(2026, 2, 8)).toISOString(),
        },
      }
      expect(sessionsFor(malformedTermCourse)).toEqual([])
    })

    it('increments ordinal correctly across all sessions', () => {
      const course: Course = {
        ...courseMWF,
        term: {
          start: startOfDay(new Date(2026, 2, 2)).toISOString(), // Monday
          end: startOfDay(new Date(2026, 2, 13)).toISOString(), // Friday (next week)
        },
      }
      const sessions = sessionsFor(course)
      expect(sessions.length).toBe(6) // 2 weeks of MWF
      sessions.forEach((session, index) => {
        expect(session.ordinal).toBe(index + 1)
      })
    })

    it('sets courseId on all sessions', () => {
      const sessions = sessionsFor(courseMWF)
      sessions.forEach((session) => {
        expect(session.courseId).toBe('course-1')
      })
    })
  })

  describe('findSession', () => {
    // Note: sessions are derived fresh in each test to avoid pinned dates (ADR-0002 constraint applies to seed data only)

    it('returns session when date matches a meeting day', () => {
      // Monday, March 2, 2026 - a Monday is in meetingDays
      // Use a local midnight representation
      const matchDate = startOfDay(new Date(2026, 2, 2)).toISOString()
      const result = findSession(courseMWF, matchDate)
      expect(result).not.toBeNull()
      if (result) {
        expect(isSameDay(parseISO(result.date), new Date(2026, 2, 2))).toBe(true)
        expect(result.ordinal).toBe(1)
      }
    })

    it('binds by same-day comparison, ignoring time', () => {
      // Test with different time on the same day (same calendar day, different time)
      const matchDate = new Date(2026, 2, 2, 14, 30).toISOString() // March 2, 14:30 local
      const result = findSession(courseMWF, matchDate)
      expect(result).not.toBeNull()
      if (result) {
        expect(isSameDay(parseISO(result.date), new Date(2026, 2, 2))).toBe(true)
        expect(result.ordinal).toBe(1)
      }
    })

    it('binds by same-day comparison with local timestamp (timezone-robust)', () => {
      // Create a timestamp at local 20:00 on a session day (March 2, 2026 is Monday)
      // This builds the date the way the app does: local Date object → ISO string
      const localDate = new Date(2026, 2, 2, 20, 30) // March 2, 2026, 20:30 local time
      const result = findSession(courseMWF, localDate.toISOString())
      expect(result).not.toBeNull()
      if (result) {
        expect(result.ordinal).toBe(1)
        // The session's date should match the calendar date
        expect(isSameDay(parseISO(result.date), new Date(2026, 2, 2))).toBe(true)
      }
    })

    it('returns null for a non-meeting day', () => {
      // Tuesday, March 3, 2026 - not in meetingDays
      const nonMeetingDate = startOfDay(new Date(2026, 2, 3)).toISOString()
      const result = findSession(courseMWF, nonMeetingDate)
      expect(result).toBeNull()
    })

    it('returns null for a date outside the term', () => {
      // February 1, 2026 - before term start
      const beforeTerm = startOfDay(new Date(2026, 1, 1)).toISOString()
      const result = findSession(courseMWF, beforeTerm)
      expect(result).toBeNull()
    })

    it('returns null for a date after term end', () => {
      // March 15, 2026 - after term end (March 8)
      const afterTerm = startOfDay(new Date(2026, 2, 15)).toISOString()
      const result = findSession(courseMWF, afterTerm)
      expect(result).toBeNull()
    })

    it('returns the correct ordinal for a matched session', () => {
      // Friday is the 3rd session
      const fridayDate = startOfDay(new Date(2026, 2, 6)).toISOString()
      const result = findSession(courseMWF, fridayDate)
      expect(result?.ordinal).toBe(3)
    })
  })

  describe('isSessionMarked', () => {
    // The one marked-vs-unmarked rule (ADR-0034, factored out per ADR-0038):
    // a session is marked iff ANY AttendanceRecord for its course matches its
    // date same-day.
    const sessionDate = startOfDay(new Date(2026, 2, 2)).toISOString() // Mon March 2

    function makeAttendance(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
      return {
        id: 'att-1',
        courseId: 'course-1',
        studentId: 'stu-1',
        sessionDate,
        status: 'present',
        ...overrides,
      }
    }

    it('is marked when any record for the course matches the date same-day', () => {
      expect(isSessionMarked('course-1', sessionDate, [makeAttendance()])).toBe(true)
    })

    it('matches same-day regardless of the record timestamp time-of-day', () => {
      const eveningRecord = makeAttendance({
        sessionDate: new Date(2026, 2, 2, 20, 30).toISOString(),
      })
      expect(isSessionMarked('course-1', sessionDate, [eveningRecord])).toBe(true)
    })

    it('a record for another course never marks the session', () => {
      const otherCourse = makeAttendance({ courseId: 'course-other' })
      expect(isSessionMarked('course-1', sessionDate, [otherCourse])).toBe(false)
    })

    it('a record on a different day never marks the session', () => {
      const otherDay = makeAttendance({
        sessionDate: startOfDay(new Date(2026, 2, 3)).toISOString(),
      })
      expect(isSessionMarked('course-1', sessionDate, [otherDay])).toBe(false)
    })

    it('is unmarked when attendance is empty', () => {
      expect(isSessionMarked('course-1', sessionDate, [])).toBe(false)
    })

    it('any status counts as marked — absent and excused records still mark', () => {
      expect(isSessionMarked('course-1', sessionDate, [makeAttendance({ status: 'absent' })])).toBe(
        true
      )
      expect(
        isSessionMarked('course-1', sessionDate, [makeAttendance({ status: 'excused' })])
      ).toBe(true)
    })
  })

  describe('sessions with term boundaries built from startOfDay', () => {
    it('derives sessions correctly when term bounds are startOfDay dates (timezone-robust)', () => {
      // Build term boundaries the way date-fns does: startOfDay creates local midnight
      const termStart = startOfDay(new Date(2026, 2, 2)) // Monday, March 2
      const termEnd = startOfDay(new Date(2026, 2, 8)) // Sunday, March 8
      const course: Course = {
        id: 'course-2',
        name: 'Physics 101',
        description: 'Mechanics',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'primaria',
        status: 'published',
        capacity: 20,
        teacherId: 'teacher-2',
        term: {
          start: termStart.toISOString(),
          end: termEnd.toISOString(),
        },
        meetingDays: ['mon', 'wed', 'fri'],
        createdAt: '2026-01-01T00:00:00Z',
      }
      const sessions = sessionsFor(course)
      expect(sessions).toHaveLength(3)
      // Sessions should be on Mon, Wed, Fri
      expect(sessions[0]?.ordinal).toBe(1)
      expect(sessions[1]?.ordinal).toBe(2)
      expect(sessions[2]?.ordinal).toBe(3)
    })

    it('constructs dates by extracting calendar days, not UTC conversion', () => {
      // This test demonstrates the core contract: dates are calendar day anchors,
      // not absolute instants in time masquerading as local midnight.
      // Create a term: June 15-20, 2026, with Monday+Wednesday meetings
      const termStart = startOfDay(new Date(2026, 5, 15)) // June 15, 2026 (Monday)
      const termEnd = startOfDay(new Date(2026, 5, 20)) // June 20, 2026 (Saturday)

      const course: Course = {
        id: 'course-3',
        name: 'Test Course',
        description: 'Test',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'primaria',
        status: 'published',
        capacity: 20,
        teacherId: 'teacher-3',
        term: {
          start: termStart.toISOString(),
          end: termEnd.toISOString(),
        },
        meetingDays: ['mon', 'wed'],
        createdAt: '2026-01-01T00:00:00Z',
      }

      const sessions = sessionsFor(course)
      expect(sessions).toHaveLength(2) // Monday 6/15 and Wednesday 6/17

      // The session dates must represent the correct local calendar day
      // Use isSameDay to verify the local calendar dates
      const session0 = sessions.at(0)
      const session1 = sessions.at(1)
      expect(session0).toBeDefined()
      expect(session1).toBeDefined()
      if (session0) {
        expect(isSameDay(parseISO(session0.date), new Date(2026, 5, 15))).toBe(true)
      }
      if (session1) {
        expect(isSameDay(parseISO(session1.date), new Date(2026, 5, 17))).toBe(true)
      }
    })
  })

  // ADR-0034: one session-window boundary. A Session is past/recordable iff its
  // date <= today, upcoming iff its date > today — the single predicate the
  // three call sites (markability, closeReadiness's unrecorded filter, the
  // dashboards) all route through so they cannot diverge.
  describe('session-window boundary', () => {
    const session = (date: Date): Session => ({
      courseId: 'course-1',
      date: startOfDay(date).toISOString(),
      ordinal: 1,
    })

    const today = startOfDay(new Date(2026, 2, 4)) // Wednesday, March 4, 2026
    const yesterday = session(new Date(2026, 2, 3))
    const todaySession = session(new Date(2026, 2, 4))
    const tomorrow = session(new Date(2026, 2, 5))

    it('treats yesterday and today as recordable, tomorrow as not', () => {
      expect(isSessionRecordable(yesterday, today)).toBe(true)
      expect(isSessionRecordable(todaySession, today)).toBe(true)
      expect(isSessionRecordable(tomorrow, today)).toBe(false)
    })

    it('treats only tomorrow as upcoming', () => {
      expect(isSessionUpcoming(yesterday, today)).toBe(false)
      expect(isSessionUpcoming(todaySession, today)).toBe(false)
      expect(isSessionUpcoming(tomorrow, today)).toBe(true)
    })

    it('recordable and upcoming are exact complements at every boundary point', () => {
      for (const s of [yesterday, todaySession, tomorrow]) {
        expect(isSessionUpcoming(s, today)).toBe(!isSessionRecordable(s, today))
      }
    })

    it('is day-granular: a same-day noon reference agrees with midnight today', () => {
      // Proves the ADR's "switching now() → today() is a no-op": passing a live
      // clock reading (noon) yields the same verdict as startOfDay(today).
      const noon = new Date(2026, 2, 4, 12, 0)
      for (const s of [yesterday, todaySession, tomorrow]) {
        expect(isSessionRecordable(s, noon)).toBe(isSessionRecordable(s, today))
        expect(isSessionUpcoming(s, noon)).toBe(isSessionUpcoming(s, today))
      }
    })
  })

  describe('upcomingSessions', () => {
    const today = startOfDay(new Date(2026, 2, 4)) // Wednesday, March 4, 2026

    // MWF, Mar 2 – Mar 13: Mon 2, Wed 4, Fri 6, Mon 9, Wed 11, Fri 13
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

    // Tue/Thu, Mar 3 – Mar 12: Tue 3, Thu 5, Tue 10, Thu 12
    const courseTuTh: Course = {
      ...courseMWF,
      id: 'course-tuth',
      name: 'Physics 101',
      meetingDays: ['tue', 'thu'],
      term: {
        start: startOfDay(new Date(2026, 2, 3)).toISOString(),
        end: startOfDay(new Date(2026, 2, 12)).toISOString(),
      },
    }

    it('excludes past and today sessions, keeping only strictly-future ones', () => {
      const result = upcomingSessions([courseMWF, courseTuTh], today)
      // Nothing on Mar 2 (past), Mar 3 (past), or Mar 4 (today) survives.
      for (const s of result) {
        expect(parseISO(s.date).getTime()).toBeGreaterThan(today.getTime())
      }
    })

    it('orders ascending by date, interleaving across courses, enriched with course name', () => {
      const result = upcomingSessions([courseMWF, courseTuTh], today)
      const actual = result.map((s) => ({
        day: startOfDay(parseISO(s.date)).getTime(),
        courseName: s.courseName,
      }))
      const expected = [
        { day: startOfDay(new Date(2026, 2, 5)).getTime(), courseName: 'Physics 101' }, // Thu
        { day: startOfDay(new Date(2026, 2, 6)).getTime(), courseName: 'Math 101' }, // Fri
        { day: startOfDay(new Date(2026, 2, 9)).getTime(), courseName: 'Math 101' }, // Mon
        { day: startOfDay(new Date(2026, 2, 10)).getTime(), courseName: 'Physics 101' }, // Tue
        { day: startOfDay(new Date(2026, 2, 11)).getTime(), courseName: 'Math 101' }, // Wed
        { day: startOfDay(new Date(2026, 2, 12)).getTime(), courseName: 'Physics 101' }, // Thu
        { day: startOfDay(new Date(2026, 2, 13)).getTime(), courseName: 'Math 101' }, // Fri
      ]
      expect(actual).toEqual(expected)
    })

    it('caps the result at limit when provided, keeping the earliest', () => {
      const result = upcomingSessions([courseMWF, courseTuTh], today, 3)
      const days = result.map((s) => startOfDay(parseISO(s.date)).getTime())
      expect(days).toEqual([
        startOfDay(new Date(2026, 2, 5)).getTime(),
        startOfDay(new Date(2026, 2, 6)).getTime(),
        startOfDay(new Date(2026, 2, 9)).getTime(),
      ])
    })

    it('returns all upcoming sessions when limit is omitted', () => {
      const withLimit = upcomingSessions([courseMWF, courseTuTh], today, 100)
      const withoutLimit = upcomingSessions([courseMWF, courseTuTh], today)
      expect(withoutLimit).toEqual(withLimit)
    })

    it('preserves each session ordinal and courseId', () => {
      const result = upcomingSessions([courseMWF], today)
      const first = result.at(0)
      // Fri 6 is the 3rd MWF session (Mon 2, Wed 4, Fri 6).
      expect(first?.courseName).toBe('Math 101')
      expect(first?.ordinal).toBe(3)
      expect(first?.courseId).toBe('course-mwf')
    })

    it('returns empty when a future-relative today outruns every session', () => {
      const future = addDays(today, 30)
      expect(upcomingSessions([courseMWF, courseTuTh], future)).toEqual([])
    })
  })
})
