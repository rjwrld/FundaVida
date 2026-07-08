import { describe, it, expect } from 'vitest'
import { isSameDay, startOfDay } from 'date-fns'
import {
  nearestSessionsAround,
  startOfWeekMonday,
  visibleWorkweekDays,
  weekAgendaDays,
} from '../weekAgenda'
import type { Course } from '@/types/domain'

describe('weekAgenda', () => {
  const termStart = startOfDay(new Date(2026, 5, 1)) // Monday, June 1, 2026
  const termEnd = startOfDay(new Date(2026, 5, 30))

  const courseMonWed: Course = {
    id: 'course-1',
    name: 'Math 101',
    description: '',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'teacher-1',
    term: { start: termStart.toISOString(), end: termEnd.toISOString() },
    meetingDays: ['mon', 'wed'],
    createdAt: '2026-01-01T00:00:00Z',
  }

  describe('startOfWeekMonday', () => {
    it('returns the same Monday when given a Monday', () => {
      const monday = new Date(2026, 5, 15) // Monday, June 15, 2026
      expect(isSameDay(startOfWeekMonday(monday), monday)).toBe(true)
    })

    it('returns the preceding Monday when given a mid-week day', () => {
      const wednesday = new Date(2026, 5, 17) // Wednesday, June 17, 2026
      const result = startOfWeekMonday(wednesday)
      expect(isSameDay(result, new Date(2026, 5, 15))).toBe(true)
    })

    it('returns the preceding Monday when given a Sunday (week ends, not starts)', () => {
      const sunday = new Date(2026, 5, 21) // Sunday, June 21, 2026
      const result = startOfWeekMonday(sunday)
      expect(isSameDay(result, new Date(2026, 5, 15))).toBe(true)
    })
  })

  describe('weekAgendaDays', () => {
    it('returns seven day-columns Mon through Sun', () => {
      const days = weekAgendaDays([courseMonWed], new Date(2026, 5, 17))
      expect(days).toHaveLength(7)
      const monday = days.at(0)
      const sunday = days.at(6)
      expect(monday).toBeDefined()
      expect(sunday).toBeDefined()
      if (monday) expect(isSameDay(monday.date, new Date(2026, 5, 15))).toBe(true)
      if (sunday) expect(isSameDay(sunday.date, new Date(2026, 5, 21))).toBe(true)
    })

    it('buckets each Session into its calendar day, tagged with its Course', () => {
      const days = weekAgendaDays([courseMonWed], new Date(2026, 5, 17))

      const monday = days.at(0)
      expect(monday).toBeDefined()
      if (monday) {
        expect(monday.sessions).toHaveLength(1)
        const mondaySession = monday.sessions.at(0)
        expect(mondaySession).toBeDefined()
        if (mondaySession) {
          expect(mondaySession.course.id).toBe('course-1')
          expect(mondaySession.ordinal).toBe(5) // Mon 1, Wed 3, Mon 8, Wed 10, Mon 15 → 5th
        }
      }

      const wednesday = days.at(2)
      expect(wednesday).toBeDefined()
      if (wednesday) {
        expect(wednesday.sessions).toHaveLength(1)
        const wedSession = wednesday.sessions.at(0)
        expect(wedSession).toBeDefined()
        if (wedSession) expect(wedSession.ordinal).toBe(6) // ...Wed 17 → 6th
      }
    })

    it('renders empty days with an empty sessions array, not broken', () => {
      const days = weekAgendaDays([courseMonWed], new Date(2026, 5, 17))

      const tuesday = days.at(1)
      expect(tuesday).toBeDefined()
      if (tuesday) expect(tuesday.sessions).toEqual([])
    })

    it('sorts multiple same-day Sessions by ordinal', () => {
      const otherCourse: Course = {
        ...courseMonWed,
        id: 'course-2',
        name: 'History 101',
      }
      const days = weekAgendaDays([courseMonWed, otherCourse], new Date(2026, 5, 17))

      const monday = days.at(0)
      expect(monday).toBeDefined()
      if (monday) {
        expect(monday.sessions).toHaveLength(2)
        expect(monday.sessions.map((s) => s.course.id)).toEqual(['course-1', 'course-2'])
      }
    })

    it('returns all-empty day-columns for no Courses', () => {
      const days = weekAgendaDays([], new Date(2026, 5, 17))
      expect(days.every((d) => d.sessions.length === 0)).toBe(true)
    })

    it('tags each Session with its Course total (the n/total denominator)', () => {
      const days = weekAgendaDays([courseMonWed], new Date(2026, 5, 17))
      // June (Mon+Wed, Jun 1–30) has 9 meeting days total.
      const mondaySession = days.at(0)?.sessions.at(0)
      expect(mondaySession?.total).toBe(9)
    })
  })

  describe('visibleWorkweekDays', () => {
    it('keeps Monday–Friday and drops empty weekend columns', () => {
      const days = weekAgendaDays([courseMonWed], new Date(2026, 5, 17))
      const visible = visibleWorkweekDays(days)
      expect(visible).toHaveLength(5)
      expect(isSameDay(visible.at(0)?.date ?? new Date(0), new Date(2026, 5, 15))).toBe(true) // Mon
      expect(isSameDay(visible.at(4)?.date ?? new Date(0), new Date(2026, 5, 19))).toBe(true) // Fri
    })

    it('surfaces a weekend column when it actually carries a Session', () => {
      const satCourse: Course = {
        ...courseMonWed,
        id: 'course-sat',
        meetingDays: ['sat'],
      }
      const days = weekAgendaDays([satCourse], new Date(2026, 5, 17))
      const visible = visibleWorkweekDays(days)
      // Mon–Fri (5) + the occupied Saturday.
      expect(visible).toHaveLength(6)
      expect(isSameDay(visible.at(5)?.date ?? new Date(0), new Date(2026, 5, 20))).toBe(true) // Sat
    })

    it('drops an empty Sunday even when Saturday is present', () => {
      const satCourse: Course = { ...courseMonWed, id: 'course-sat', meetingDays: ['sat'] }
      const visible = visibleWorkweekDays(weekAgendaDays([satCourse], new Date(2026, 5, 17)))
      expect(visible.some((d) => isSameDay(d.date, new Date(2026, 5, 21)))).toBe(false) // Sun
    })
  })

  describe('nearestSessionsAround', () => {
    const weekStart = new Date(2026, 6, 6) // Mon Jul 6 — a week with no sessions (term ends Jun 30)
    const weekEnd = new Date(2026, 6, 12) // Sun Jul 12

    it('names the nearest Session before and after an empty week', () => {
      const { prev, next } = nearestSessionsAround([courseMonWed], weekStart, weekEnd)
      // Latest Session before Jul 6 is the term's last meeting day (Mon Jun 29).
      expect(prev?.courseId).toBe('course-1')
      expect(isSameDay(startOfDay(new Date(prev?.date ?? 0)), new Date(2026, 5, 29))).toBe(true)
      // Nothing after the term ends.
      expect(next).toBeNull()
    })

    it('finds the next Session when the displayed week is before the term', () => {
      const before = new Date(2026, 4, 4) // early May, before the June term
      const { prev, next } = nearestSessionsAround([courseMonWed], before, new Date(2026, 4, 10))
      expect(prev).toBeNull()
      expect(isSameDay(startOfDay(new Date(next?.date ?? 0)), new Date(2026, 5, 1))).toBe(true)
    })

    it('returns nulls when no Courses have Sessions', () => {
      expect(nearestSessionsAround([], weekStart, weekEnd)).toEqual({ prev: null, next: null })
    })
  })
})
