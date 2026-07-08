import { describe, it, expect } from 'vitest'
import { addDays, startOfDay } from 'date-fns'
import type { Course, CourseStatus } from '@/types'
import { courseDisplayState, isOpenForEnrollment, isLiveCohort } from '../courseDisplayState'
import { coursesToClose } from '../dashboard'

// Term bounds built the proper way: startOfDay(local Date) → toISOString() (ADR-0001).
const termStart = startOfDay(new Date(2026, 5, 1)) // Mon, June 1, 2026
const termEnd = startOfDay(new Date(2026, 5, 30)) // Tue, June 30, 2026

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cou-1',
    name: 'Math 101',
    description: 'Calculus',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: termStart.toISOString(), end: termEnd.toISOString() },
    meetingDays: ['mon', 'wed', 'fri'],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// A fixed time-of-day so the day-boundary assertions are unambiguous.
const at = (d: Date) => new Date(d.getTime() + 12 * 60 * 60 * 1000)

describe('courseDisplayState', () => {
  describe('lifecycle values that ignore the clock', () => {
    it('maps draft → draft regardless of Term dates', () => {
      const now = at(addDays(termStart, 5)) // inside the Term window
      expect(courseDisplayState(makeCourse({ status: 'draft' }), now)).toBe('draft')
    })

    it('maps closed → finished regardless of Term dates', () => {
      const now = at(addDays(termStart, 5)) // inside the Term window
      expect(courseDisplayState(makeCourse({ status: 'closed' }), now)).toBe('finished')
    })
  })

  describe('published courses derive from Term dates at the day boundaries', () => {
    const course = makeCourse({ status: 'published' })

    it('day before start → startsSoon', () => {
      expect(courseDisplayState(course, at(addDays(termStart, -1)))).toBe('startsSoon')
    })

    it('start day → inProgress', () => {
      expect(courseDisplayState(course, at(termStart))).toBe('inProgress')
    })

    it('a day mid-Term → inProgress', () => {
      expect(courseDisplayState(course, at(addDays(termStart, 5)))).toBe('inProgress')
    })

    it('end day → termEnded (matches the coursesToClose predicate)', () => {
      // The close-readiness worklist boundary: coursesToClose uses a strict
      // term.end < now, so a published course whose end-day midnight has passed
      // is already "Term ended". Same seam, same rule.
      expect(courseDisplayState(course, at(termEnd))).toBe('termEnded')
    })

    it('day after end → termEnded', () => {
      expect(courseDisplayState(course, at(addDays(termEnd, 1)))).toBe('termEnded')
    })
  })

  describe('termEnded is exactly the coursesToClose predicate (one shared seam)', () => {
    const course = makeCourse({ status: 'published' })
    const days = [
      at(addDays(termStart, -1)),
      at(termStart),
      at(addDays(termStart, 5)),
      at(termEnd),
      at(addDays(termEnd, 1)),
    ]

    it('displayState==="termEnded" iff the course appears in coursesToClose', () => {
      for (const now of days) {
        const inWorklist = coursesToClose([course], now).length === 1
        const badgeEnded = courseDisplayState(course, now) === 'termEnded'
        expect(badgeEnded).toBe(inWorklist)
      }
    })
  })
})

describe('isOpenForEnrollment', () => {
  const now = at(addDays(termStart, 5)) // mid-Term instant reused across cases

  it('accepts only startsSoon / inProgress courses', () => {
    // startsSoon: now before start.
    expect(
      isOpenForEnrollment(makeCourse({ status: 'published' }), at(addDays(termStart, -1)))
    ).toBe(true)
    // inProgress: now mid-Term.
    expect(isOpenForEnrollment(makeCourse({ status: 'published' }), now)).toBe(true)
    // termEnded: now after end.
    expect(isOpenForEnrollment(makeCourse({ status: 'published' }), at(addDays(termEnd, 1)))).toBe(
      false
    )
    // draft / closed are never open.
    expect(isOpenForEnrollment(makeCourse({ status: 'draft' }), now)).toBe(false)
    expect(isOpenForEnrollment(makeCourse({ status: 'closed' }), now)).toBe(false)
  })

  it('agrees with courseDisplayState across every lifecycle value', () => {
    const statuses: CourseStatus[] = ['draft', 'published', 'closed']
    for (const status of statuses) {
      const c = makeCourse({ status })
      const state = courseDisplayState(c, now)
      expect(isOpenForEnrollment(c, now)).toBe(state === 'startsSoon' || state === 'inProgress')
    }
  })
})

describe('isLiveCohort', () => {
  it('is true for every non-closed lifecycle value, false for closed', () => {
    expect(isLiveCohort(makeCourse({ status: 'draft' }))).toBe(true)
    expect(isLiveCohort(makeCourse({ status: 'published' }))).toBe(true)
    expect(isLiveCohort(makeCourse({ status: 'closed' }))).toBe(false)
  })

  it('ignores the clock — liveness is the stored lifecycle, not Term dates', () => {
    // A published cohort whose Term has ended is still "live" (edits/posts allowed);
    // only the close ceremony ends it. That axis is isOpenForEnrollment, not this one.
    expect(isLiveCohort(makeCourse({ status: 'published' }))).toBe(true)
  })

  it('treats a nullish Course (still-loading detail read) as not live', () => {
    expect(isLiveCohort(null)).toBe(false)
    expect(isLiveCohort(undefined)).toBe(false)
  })
})
