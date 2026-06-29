import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedState, clearPersistedRole, clearPersistedCurrentUser } from '../persistence'
import { applyScope } from '../api/scope'
import { api } from '../api'

function getStudent() {
  const student = useStore.getState().students[0]
  if (!student) throw new Error('No student in seed')
  return student
}

describe('enrollment request mutations', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  describe('requestEnrollment', () => {
    it('creates a pending enrollment when student requests a course', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      // Find a browseable course
      const browseableCourse = state.courses.find(
        (c) =>
          c.status === 'published' &&
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          !student.enrolledCourseIds.includes(c.id)
      )

      expect(browseableCourse).toBeDefined()

      expect(browseableCourse).toBeDefined()
      if (browseableCourse) {
        const initialEnrollmentCount = state.enrollments.length
        const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)

        expect(enrollment).toBeDefined()
        expect(enrollment.studentId).toBe(student.id)
        expect(enrollment.courseId).toBe(browseableCourse.id)
        expect(enrollment.status).toBe('pending')
        expect(enrollment.requestedAt).toBeDefined()
        expect(enrollment.decidedBy).toBeUndefined()
        expect(enrollment.decidedAt).toBeUndefined()

        // Check that enrollment was added
        const newState = useStore.getState()
        expect(newState.enrollments.length).toBe(initialEnrollmentCount + 1)
      }
    })

    it('throws when student tries to request a course at different sede', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      // Find a course at a different sede
      const differentSedeCourse = state.courses.find((c) => c.sede !== student.sede)
      expect(differentSedeCourse).toBeDefined()

      if (differentSedeCourse) {
        expect(() => {
          useStore.getState().requestEnrollment(student.id, differentSedeCourse.id)
        }).toThrow(/Sede mismatch/)
      }
    })

    it('throws when student tries to request a course with non-matching level', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      // Find a course with non-matching level
      const differentLevelCourse = state.courses.find(
        (c) => c.sede === student.sede && c.level !== student.educationalLevel
      )

      // Skip if no such course exists in the seed
      if (!differentLevelCourse) {
        return
      }

      expect(() => {
        useStore.getState().requestEnrollment(student.id, differentLevelCourse.id)
      }).toThrow(/Level mismatch/)
    })

    it('emits an audit entry when request is created', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      const browseableCourse = state.courses.find(
        (c) =>
          c.status === 'published' &&
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          !student.enrolledCourseIds.includes(c.id)
      )

      if (!browseableCourse) {
        return
      }

      const initialAuditCount = state.auditLog.length
      useStore.getState().requestEnrollment(student.id, browseableCourse.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
      if (newState.auditLog[0]) {
        expect(newState.auditLog[0].action).toBe('requestEnroll')
      }
    })
  })

  describe('withdrawEnrollmentRequest', () => {
    it('changes pending enrollment status to withdrawn', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      const browseableCourse = state.courses.find(
        (c) =>
          c.status === 'published' &&
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          !student.enrolledCourseIds.includes(c.id)
      )

      expect(browseableCourse).toBeDefined()
      if (browseableCourse) {
        // Create a pending enrollment
        const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)

        // Withdraw it
        useStore.getState().withdrawEnrollmentRequest(enrollment.id)

        const newState = useStore.getState()
        const updatedEnrollment = newState.enrollments.find((e) => e.id === enrollment.id)
        expect(updatedEnrollment?.status).toBe('withdrawn')
      }
    })

    it('emits an audit entry when request is withdrawn', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const student = getStudent()

      const browseableCourse = state.courses.find(
        (c) =>
          c.status === 'published' &&
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          !student.enrolledCourseIds.includes(c.id)
      )

      if (!browseableCourse) {
        return
      }

      const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)
      const initialAuditCount = useStore.getState().auditLog.length

      useStore.getState().withdrawEnrollmentRequest(enrollment.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
      if (newState.auditLog[0]) {
        expect(newState.auditLog[0].action).toBe('withdraw')
      }
    })
  })

  describe('scope filtering', () => {
    it('student should see enrolled courses through enrolled scope', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const studentId = 'stu-1'

      // Get enrollments for this student
      const enrollments = state.enrollments.filter((e) => e.studentId === studentId)

      expect(enrollments.length).toBeGreaterThan(0)

      // Apply enrolled scope
      const scoped = applyScope('courses', 'enrolled', state.courses)

      // All scoped courses should be in the student's enrollments
      for (const course of scoped) {
        const isEnrolled = enrollments.some((e) => e.courseId === course.id)
        expect(isEnrolled).toBe(true)
      }
    })

    it('API should return enrolled courses for student', async () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const studentId = 'stu-1'

      const enrollments = state.enrollments.filter((e) => e.studentId === studentId)

      // Get first enrolled course
      if (enrollments.length > 0 && enrollments[0]) {
        const courseId = enrollments[0].courseId
        const course = await api.courses.get(courseId)
        expect(course).toBeDefined()
        expect(course?.id).toBe(courseId)
      }
    })
  })
})
