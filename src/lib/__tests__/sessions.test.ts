import { describe, it, expect } from 'vitest'
import { sessionsFor, findSession } from '../sessions'
import { type Course } from '@/types/domain'
import { startOfDay, isSameDay, parseISO } from 'date-fns'

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
})
