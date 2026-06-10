import { describe, it, expect } from 'vitest'
import { seedCourses } from '@/data/seed/courses'
import { isAfter, isBefore, startOfToday, differenceInWeeks } from 'date-fns'

function isWithinDays(date: Date, baseDate: Date, days: number): boolean {
  const diff = Math.abs(baseDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= days
}

describe('seedCourses', () => {
  it('generates 8 courses with term and meeting days', () => {
    const courses = seedCourses(['t-1', 't-2'], 8)
    expect(courses).toHaveLength(8)
    courses.forEach((course) => {
      expect(course.term).toBeDefined()
      expect(course.term.start).toBeDefined()
      expect(course.term.end).toBeDefined()
      expect(course.meetingDays).toBeDefined()
      expect(Array.isArray(course.meetingDays)).toBe(true)
      expect(course.meetingDays.length).toBeGreaterThanOrEqual(1)
      expect(course.meetingDays.length).toBeLessThanOrEqual(3)
      // Verify all meeting days are valid weekdays
      course.meetingDays.forEach((day) => {
        expect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).toContain(day)
      })
      // Verify term start is before end
      const startDate = new Date(course.term.start)
      const endDate = new Date(course.term.end)
      expect(isBefore(startDate, endDate) || startDate.getTime() === endDate.getTime()).toBe(true)
    })
  })

  it('distributes courses: 2 completed, 1 just-ended, 4 in-progress, 1 upcoming', () => {
    const courses = seedCourses(['t-1', 't-2'], 8)
    const today = startOfToday()

    const justEnded = courses.filter((c) => {
      const endDate = new Date(c.term.end)
      return isWithinDays(endDate, today, 10) && isBefore(endDate, today)
    })

    const completed = courses.filter((c) => {
      const endDate = new Date(c.term.end)
      return isBefore(endDate, today) && !isWithinDays(endDate, today, 10)
    })

    const inProgress = courses.filter((c) => {
      const startDate = new Date(c.term.start)
      const endDate = new Date(c.term.end)
      return !isBefore(today, startDate) && isAfter(endDate, today)
    })

    const upcoming = courses.filter((c) => {
      const startDate = new Date(c.term.start)
      return isAfter(startDate, today) && isWithinDays(startDate, today, 14)
    })

    expect(completed.length).toBe(2)
    expect(justEnded.length).toBe(1)
    expect(inProgress.length).toBe(4)
    expect(upcoming.length).toBe(1)
  })

  it('ensures terms are 8–16 weeks long', () => {
    const courses = seedCourses(['t-1', 't-2'], 8)
    courses.forEach((course) => {
      const startDate = new Date(course.term.start)
      const endDate = new Date(course.term.end)
      const weeks = differenceInWeeks(endDate, startDate)
      expect(weeks).toBeGreaterThanOrEqual(8)
      expect(weeks).toBeLessThanOrEqual(16)
    })
  })

  it('ensures createdAt is before term.start', () => {
    const courses = seedCourses(['t-1', 't-2'], 8)
    courses.forEach((course) => {
      const createdDate = new Date(course.createdAt)
      const startDate = new Date(course.term.start)
      expect(isBefore(createdDate, startDate)).toBe(true)
    })
  })
})
