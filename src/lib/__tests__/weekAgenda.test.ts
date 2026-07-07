import { describe, it, expect } from 'vitest'
import { isSameDay, startOfDay } from 'date-fns'
import { startOfWeekMonday, weekAgendaDays } from '../weekAgenda'
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
  })
})
