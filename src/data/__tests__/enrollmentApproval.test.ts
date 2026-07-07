import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedState, clearPersistedRole, clearPersistedCurrentUser } from '../persistence'
import { clock } from '@/lib/clock'
import { isOpenForEnrollment } from '@/lib/courseDisplayState'

function getTeacher() {
  const teacher = useStore.getState().teachers[0]
  if (!teacher) throw new Error('No teacher in seed')
  return teacher
}

function getStudent() {
  const student = useStore.getState().students[0]
  if (!student) throw new Error('No student in seed')
  return student
}

describe('enrollment approval mutations', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  describe('approveEnrollment', () => {
    it('moves a pending enrollment to approved and sets decidedBy/decidedAt', () => {
      // Student requests enrollment
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      // Get a course owned by the teacher at the same sede as the student
      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) {
        // Skip if no suitable course exists
        return
      }

      // Create a pending enrollment (student requests)
      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)
      expect(enrollment.status).toBe('pending')

      // Switch to teacher role and approve
      useStore.getState().setRole('teacher')
      const approved = useStore.getState().approveEnrollment(enrollment.id)

      expect(approved.status).toBe('approved')
      expect(approved.decidedBy).toBe(teacher.id)
      expect(approved.decidedAt).toBeDefined()

      // Verify in store state
      const newState = useStore.getState()
      const updated = newState.enrollments.find((e) => e.id === enrollment.id)
      expect(updated?.status).toBe('approved')
    })

    it('adds the approved course to student enrolledCourseIds', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      useStore.getState().setRole('teacher')
      useStore.getState().approveEnrollment(enrollment.id)

      const newState = useStore.getState()
      const updatedStudent = newState.students.find((s) => s.id === student.id)
      expect(updatedStudent?.enrolledCourseIds).toContain(course.id)
    })

    it('throws when course capacity is reached', () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()

      // Pick a course open for enrollment (ADR-0042) and the unenrolled students
      // eligible for it: same Sede and matching level (ADR-0020).
      const now = clock.now()
      const course = state.courses.find(
        (c) => c.capacity > 0 && c.status === 'published' && isOpenForEnrollment(c, now)
      )
      if (!course) return
      const enrolledIds = new Set(
        state.enrollments.filter((e) => e.courseId === course.id).map((e) => e.studentId)
      )
      const eligible = state.students.filter(
        (s) =>
          s.sede === course.sede && s.educationalLevel === course.level && !enrolledIds.has(s.id)
      )
      // Need two more eligible students than the course has room for.
      if (eligible.length < 2) return

      // Set capacity to one seat above the already-approved count, so a single
      // new approval fills it and the next one overruns.
      const approvedNow = state.enrollments.filter(
        (e) => e.courseId === course.id && e.status === 'approved'
      ).length
      useStore.getState().updateCourse(course.id, { capacity: approvedNow + 1 })

      const pendingIds = eligible.slice(0, 2).map((s) => {
        useStore.getState().setRole('student')
        return useStore.getState().requestEnrollment(s.id, course.id).id
      })

      useStore.getState().setRole('admin')
      useStore.getState().approveEnrollment(pendingIds[0] as string) // fills the last seat

      // The next approval exceeds capacity.
      expect(() => {
        useStore.getState().approveEnrollment(pendingIds[1] as string)
      }).toThrow(/capacity/)
    })

    it('emits an audit entry when approved', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      useStore.getState().setRole('teacher')
      const initialAuditCount = useStore.getState().auditLog.length

      useStore.getState().approveEnrollment(enrollment.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
      if (newState.auditLog[0]) {
        expect(newState.auditLog[0].action).toBe('approve')
      }
    })

    it('is restricted to course owner (teacher) or admin', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      // Student should not be able to approve
      expect(() => {
        useStore.getState().approveEnrollment(enrollment.id)
      }).toThrow(/permission denied/)
    })
  })

  describe('rejectEnrollment', () => {
    it('moves a pending enrollment to rejected and sets decidedBy/decidedAt', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      useStore.getState().setRole('teacher')
      const rejected = useStore.getState().rejectEnrollment(enrollment.id)

      expect(rejected.status).toBe('rejected')
      expect(rejected.decidedBy).toBe(teacher.id)
      expect(rejected.decidedAt).toBeDefined()
    })

    it('emits an audit entry when rejected', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      useStore.getState().setRole('teacher')
      const initialAuditCount = useStore.getState().auditLog.length

      useStore.getState().rejectEnrollment(enrollment.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
    })

    it('is restricted to course owner (teacher) or admin', () => {
      useStore.getState().setRole('student')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      const course = state.courses.find(
        (c) => c.teacherId === teacher.id && c.sede === student.sede
      )

      if (!course) return

      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      // Student should not be able to reject
      expect(() => {
        useStore.getState().rejectEnrollment(enrollment.id)
      }).toThrow(/permission denied/)
    })
  })

  describe('enrollStudent with Level check', () => {
    it('throws when student tries to enroll in a course with non-matching level', () => {
      const state = useStore.getState()
      const student = getStudent()

      // Find a course with non-matching level
      const differentLevelCourse = state.courses.find(
        (c) => c.sede === student.sede && c.level !== student.educationalLevel
      )

      if (!differentLevelCourse) {
        return
      }

      // Admin or teacher direct-enroll should throw
      useStore.getState().setRole('admin')
      expect(() => {
        useStore.getState().enrollStudent(student.id, differentLevelCourse.id)
      }).toThrow(/Level mismatch/)
    })

    it('allows admin to direct-enroll a student into their matching level course', () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      // Use a different student to avoid conflicts with earlier tests
      const allStudents = state.students
      if (allStudents.length < 2) return
      const student = allStudents[1]
      if (!student) return

      // Find a course matching the student's level
      const matchingCourse = state.courses.find(
        (c) =>
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          !state.enrollments.some((e) => e.studentId === student.id && e.courseId === c.id)
      )

      if (!matchingCourse) return

      const enrollment = useStore.getState().enrollStudent(student.id, matchingCourse.id)
      expect(enrollment.status).toBe('approved')
      expect(enrollment.decidedBy).toBeDefined()
    })
  })

  describe('teacher create (direct enroll) permission', () => {
    it('allows teacher to direct-enroll into their own course', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = getTeacher()
      // Use a different student to avoid conflicts with earlier tests
      const allStudents = state.students
      if (allStudents.length < 3) return
      const student = allStudents[2]
      if (!student) return

      const now = clock.now()
      const ownCourse = state.courses.find(
        (c) =>
          c.teacherId === teacher.id &&
          c.sede === student.sede &&
          c.level === student.educationalLevel &&
          c.status === 'published' &&
          isOpenForEnrollment(c, now) &&
          !state.enrollments.some((e) => e.studentId === student.id && e.courseId === c.id)
      )

      if (!ownCourse) return

      const enrollment = useStore.getState().enrollStudent(student.id, ownCourse.id)
      expect(enrollment.status).toBe('approved')
    })

    it('blocks teacher from direct-enrolling into courses they do not own', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = getTeacher()
      const student = getStudent()

      // Find a course owned by a different teacher
      const otherTeacherCourse = state.courses.find(
        (c) => c.teacherId !== teacher.id && c.sede === student.sede
      )

      if (!otherTeacherCourse) return

      expect(() => {
        useStore.getState().enrollStudent(student.id, otherTeacherCourse.id)
      }).toThrow(/permission denied/)
    })
  })
})
