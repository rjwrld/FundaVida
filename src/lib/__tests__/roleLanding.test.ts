import { describe, it, expect } from 'vitest'
import { landingPathForRole } from '@/lib/roleLanding'
import type { Course, Enrollment, Grade } from '@/types'

// A Term that ended well before now, and one that runs well past it. Fixed
// far-apart dates keep "ended vs in-progress" stable without mocking the clock,
// matching how the matrix enter-grades predicate reads `new Date()`.
const ENDED = { start: '2020-01-01T00:00:00.000Z', end: '2020-03-01T00:00:00.000Z' }
const IN_PROGRESS = { start: '2020-01-01T00:00:00.000Z', end: '2999-01-01T00:00:00.000Z' }

function makeCourse(overrides: Partial<Course> & Pick<Course, 'id' | 'teacherId'>): Course {
  return {
    name: 'Course',
    description: '',
    sede: 'Linda Vista',
    programName: 'Program',
    term: ENDED,
    meetingDays: ['mon'],
    createdAt: '2019-12-01T00:00:00.000Z',
    ...overrides,
  }
}

function enrollment(id: string, studentId: string, courseId: string): Enrollment {
  return { id, studentId, courseId, enrolledAt: '2020-01-01T00:00:00.000Z' }
}

function grade(id: string, studentId: string, courseId: string): Grade {
  return { id, studentId, courseId, score: 90, issuedAt: '2020-03-05T00:00:00.000Z' }
}

const TEACHER = 'tea-1'

describe('landingPathForRole', () => {
  it('sends a teacher to its ended owned Course that still has an ungraded enrollment', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: ENDED })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [],
      currentUserId: TEACHER,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app/courses/cou-9')
  })

  it('sends a teacher home when its ended owned Course is fully graded', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: ENDED })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [grade('gra-1', 'stu-1', 'cou-9')],
      currentUserId: TEACHER,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app')
  })

  it('sends a teacher home when its only owned Course is still in progress', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: IN_PROGRESS })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [],
      currentUserId: TEACHER,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app')
  })

  it("does not send a teacher to another teacher's ended Course", () => {
    const course = makeCourse({ id: 'cou-9', teacherId: 'tea-2', term: ENDED })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [],
      currentUserId: TEACHER,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app')
  })

  it('sends a teacher home when its ended owned Course has no enrollments to grade', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: ENDED })
    const snapshot = { courses: [course], enrollments: [], grades: [], currentUserId: TEACHER }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app')
  })

  it('sends non-teacher roles home regardless of grading state', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: ENDED })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [],
      currentUserId: 'admin',
    }
    expect(landingPathForRole('admin', snapshot)).toBe('/app')
    expect(landingPathForRole('student', { ...snapshot, currentUserId: 'stu-1' })).toBe('/app')
  })

  it('sends a teacher home when there is no current user', () => {
    const course = makeCourse({ id: 'cou-9', teacherId: TEACHER, term: ENDED })
    const snapshot = {
      courses: [course],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-9')],
      grades: [],
      currentUserId: null,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app')
  })

  it('picks the ungraded ended Course even when an earlier owned Course is already graded', () => {
    const graded = makeCourse({ id: 'cou-1', teacherId: TEACHER, term: ENDED })
    const ungraded = makeCourse({ id: 'cou-3', teacherId: TEACHER, term: ENDED })
    const snapshot = {
      courses: [graded, ungraded],
      enrollments: [enrollment('enr-1', 'stu-1', 'cou-1'), enrollment('enr-2', 'stu-1', 'cou-3')],
      grades: [grade('gra-1', 'stu-1', 'cou-1')],
      currentUserId: TEACHER,
    }
    expect(landingPathForRole('teacher', snapshot)).toBe('/app/courses/cou-3')
  })
})
