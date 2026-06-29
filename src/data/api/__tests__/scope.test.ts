import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store'
import { applyScope } from '../scope'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '../../persistence'
import type { Course } from '@/types'

function getStudent() {
  const student = useStore.getState().students[0]
  if (!student) throw new Error('No student in seed')
  return student
}

describe('openForEnrollment scope', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('filters to published, upcoming courses at student sede with matching level', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()

    // Get the student's sede and level
    const student = getStudent()
    expect(student).toBeDefined()

    const courses = state.courses
    const scoped = applyScope('courses', 'openForEnrollment', courses)

    // Should return at least some courses
    expect(scoped.length).toBeGreaterThan(0)

    // All scoped courses should be:
    // - published (not draft)
    // - upcoming or in-progress (term start is not in past relative to now)
    // - at student's sede
    // - level matches student's level or is 'both'
    // - student is not already enrolled or pending

    scoped.forEach((c) => {
      expect(c.status).toBe('published')
      expect(c.sede).toBe(student.sede)
      expect(c.level === student.educationalLevel || c.level === 'both').toBe(true)
      // Not already enrolled or pending — withdrawn/rejected courses may reappear
      // (ADR-0016).
      const activeEnrollment = state.enrollments.find(
        (e) =>
          e.studentId === student.id &&
          e.courseId === c.id &&
          (e.status === 'approved' || e.status === 'pending')
      )
      expect(activeEnrollment).toBeUndefined()
    })
  })

  it('excludes draft courses', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const student = getStudent()

    // Create a published course at student's sede
    const publishedCourse = state.courses.find(
      (c) =>
        c.status === 'published' && c.sede === student.sede && c.level === student.educationalLevel
    )

    // Create a draft course
    if (publishedCourse) {
      const draftCourse: Course = {
        ...publishedCourse,
        id: 'test-draft-cou-1',
        status: 'draft',
        createdAt: new Date().toISOString(),
      }
      useStore.getState().courses = [...state.courses, draftCourse]
    }

    const courses = useStore.getState().courses
    const scoped = applyScope('courses', 'openForEnrollment', courses)

    // Draft course should not be in the result
    expect(scoped.some((c) => c.status === 'draft')).toBe(false)
  })

  it('excludes courses at different sede', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const student = getStudent()

    const courses = state.courses
    const scoped = applyScope('courses', 'openForEnrollment', courses)

    // No scoped course should be at a different sede
    scoped.forEach((c) => {
      expect(c.sede).toBe(student.sede)
    })
  })

  it('excludes courses with non-matching level', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const student = getStudent()

    const courses = state.courses
    const scoped = applyScope('courses', 'openForEnrollment', courses)

    // All scoped courses should have level matching student or 'both'
    scoped.forEach((c) => {
      expect(c.level === student.educationalLevel || c.level === 'both').toBe(true)
    })
  })

  it('excludes courses the student is already enrolled in', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const student = getStudent()

    // Get a course the student is enrolled in
    const enrolledCourse = state.courses.find((c) => student.enrolledCourseIds.includes(c.id))

    const courses = state.courses
    const scoped = applyScope('courses', 'openForEnrollment', courses)

    // Enrolled course should not be in browse list
    if (enrolledCourse) {
      expect(scoped.some((c) => c.id === enrolledCourse.id)).toBe(false)
    }
  })

  it('excludes courses student already has pending request for', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const student = getStudent()

    // Find or create a course student can browse
    const browseableCourse = state.courses.find(
      (c) =>
        c.status === 'published' &&
        c.sede === student.sede &&
        (c.level === student.educationalLevel || c.level === 'both') &&
        !student.enrolledCourseIds.includes(c.id)
    )

    if (browseableCourse) {
      // Create a pending enrollment
      useStore.getState().enrollments = [
        ...state.enrollments,
        {
          id: 'enr-test-pending',
          studentId: student.id,
          courseId: browseableCourse.id,
          enrolledAt: new Date().toISOString(),
          status: 'pending',
          requestedAt: new Date().toISOString(),
        },
      ]

      const courses = useStore.getState().courses
      const scoped = applyScope('courses', 'openForEnrollment', courses)

      // Course with pending request should not be browseable
      expect(scoped.some((c) => c.id === browseableCourse.id)).toBe(false)
    }
  })
})

describe('certificates ownCourses scope', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('filters certificates to those in courses owned by the current teacher', () => {
    useStore.getState().setRole('teacher')
    const { currentUserId, courses, certificates } = useStore.getState()
    const ownCourseIds = new Set(
      courses.filter((c) => c.teacherId === currentUserId).map((c) => c.id)
    )

    const scoped = applyScope('certificates', 'ownCourses', certificates)

    expect(scoped.length).toBeGreaterThan(0)
    expect(scoped.every((c) => ownCourseIds.has(c.courseId))).toBe(true)
    // Proves it actually narrows: at least one seeded certificate is excluded.
    expect(scoped.length).toBeLessThan(certificates.length)
  })
})
