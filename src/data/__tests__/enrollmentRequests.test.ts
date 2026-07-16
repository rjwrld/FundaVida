import { describe, it, expect, beforeEach } from 'vitest'
import { subDays } from 'date-fns'
import { useStore } from '../store'
import { clearPersistedState, clearPersistedRole, clearPersistedCurrentUser } from '../persistence'
import { applyScope } from '../api/scope'
import { api } from '../api'
import { clock } from '@/lib/clock'
import { isOpenForEnrollment } from '@/lib/courseDisplayState'
import type { Student } from '@/types'

function getStudent() {
  const student = useStore.getState().students[0]
  if (!student) throw new Error('No student in seed')
  return student
}

/**
 * A published Course at the Student's Sede + level, in the open enrollment window
 * (ADR-0042), that the Student holds no enrollment record for at all. This is the
 * shared precondition for the request flow tests: the allowed-window regression,
 * the re-pend/withdraw/short-circuit cases (which need a fresh course), and the
 * rejection cases (which mutate this course into a closed window).
 */
function findOpenRequestableCourse(student: Student) {
  const now = clock.now()
  const course = useStore
    .getState()
    .courses.find(
      (c) =>
        c.status === 'published' &&
        c.sede === student.sede &&
        c.level === student.educationalLevel &&
        isOpenForEnrollment(c, now) &&
        !useStore
          .getState()
          .enrollments.some((e) => e.studentId === student.id && e.courseId === c.id)
    )
  if (!course) throw new Error('seed has no open requestable course at the student Sede + level')
  return course
}

/** Overwrite one Course in the store (test-only staging of a display state). */
function patchCourse(courseId: string, patch: Partial<import('@/types').Course>) {
  useStore.setState((s) => ({
    courses: s.courses.map((c) => (c.id === courseId ? { ...c, ...patch } : c)),
  }))
}

/** Overwrite one Enrollment in the store (test-only staging of ownership/status). */
function patchEnrollment(enrollmentId: string, patch: Partial<import('@/types').Enrollment>) {
  useStore.setState((s) => ({
    enrollments: s.enrollments.map((e) => (e.id === enrollmentId ? { ...e, ...patch } : e)),
  }))
}

describe('enrollment request mutations', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  describe('requestEnrollment', () => {
    it('creates a pending enrollment when student requests an open course (mid-Term allowed)', () => {
      useStore.getState().setRole('student')
      const student = getStudent()

      // Requests are accepted while the Course is Starts soon / In progress
      // (ADR-0042); this doubles as the allowed-window regression guard.
      const browseableCourse = findOpenRequestableCourse(student)
      const initialEnrollmentCount = useStore.getState().enrollments.length
      const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)

      expect(enrollment).toBeDefined()
      expect(enrollment.studentId).toBe(student.id)
      expect(enrollment.courseId).toBe(browseableCourse.id)
      expect(enrollment.status).toBe('pending')
      expect(enrollment.requestedAt).toBeDefined()
      expect(enrollment.decidedBy).toBeUndefined()
      expect(enrollment.decidedAt).toBeUndefined()

      const newState = useStore.getState()
      expect(newState.enrollments.length).toBe(initialEnrollmentCount + 1)
    })

    describe('term-end enrollment gate (ADR-0042)', () => {
      it('rejects a request once the Course Term has ended', () => {
        useStore.getState().setRole('student')
        const student = getStudent()
        const course = findOpenRequestableCourse(student)
        const now = clock.now()
        // Seal the Term in the past — same Sede + level, so the gate (not the
        // Sede/level guards, which run first) is what rejects.
        patchCourse(course.id, {
          term: { start: subDays(now, 30).toISOString(), end: subDays(now, 1).toISOString() },
        })

        const before = useStore.getState().enrollments.length
        expect(() => useStore.getState().requestEnrollment(student.id, course.id)).toThrow(
          /not open for enrollment/
        )
        expect(useStore.getState().enrollments.length).toBe(before)
      })

      it('rejects a request against a draft Course', () => {
        useStore.getState().setRole('student')
        const student = getStudent()
        const course = findOpenRequestableCourse(student)
        patchCourse(course.id, { status: 'draft' })

        expect(() => useStore.getState().requestEnrollment(student.id, course.id)).toThrow(
          /not open for enrollment/
        )
      })

      it('rejects a request against a closed Course', () => {
        useStore.getState().setRole('student')
        const student = getStudent()
        const course = findOpenRequestableCourse(student)
        patchCourse(course.id, { status: 'closed' })

        expect(() => useStore.getState().requestEnrollment(student.id, course.id)).toThrow(
          /not open for enrollment/
        )
      })
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

      const browseableCourse = findOpenRequestableCourse(student)

      const initialAuditCount = state.auditLog.length
      useStore.getState().requestEnrollment(student.id, browseableCourse.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
      if (newState.auditLog[0]) {
        expect(newState.auditLog[0].action).toBe('requestEnroll')
      }
    })

    it('re-pends the same record after a rejection (re-request lands pending)', () => {
      const student = getStudent()

      // Any course the student can browse; admin rejects (unconditional approve),
      // which decouples the test from teacher↔course ownership.
      const course = findOpenRequestableCourse(student)

      // Student requests; admin rejects.
      useStore.getState().setRole('student')
      const requested = useStore.getState().requestEnrollment(student.id, course.id)
      const enrollmentCountAfterRequest = useStore.getState().enrollments.length

      useStore.getState().setRole('admin')
      const rejected = useStore.getState().rejectEnrollment(requested.id)
      expect(rejected.status).toBe('rejected')
      expect(rejected.decidedBy).toBe('admin')

      // Student re-requests the same course: the SAME record flips back to pending,
      // the prior decision is cleared, and no duplicate enrollment is created.
      useStore.getState().setRole('student')
      const reRequested = useStore.getState().requestEnrollment(student.id, course.id)

      expect(reRequested.id).toBe(requested.id)
      expect(reRequested.status).toBe('pending')
      expect(reRequested.decidedBy).toBeUndefined()
      expect(reRequested.decidedAt).toBeUndefined()
      expect(useStore.getState().enrollments.length).toBe(enrollmentCountAfterRequest)

      const stored = useStore.getState().enrollments.find((e) => e.id === requested.id)
      expect(stored?.status).toBe('pending')
    })

    it('re-pends the same record after a withdrawal', () => {
      useStore.getState().setRole('student')
      const student = getStudent()
      const course = findOpenRequestableCourse(student)

      const requested = useStore.getState().requestEnrollment(student.id, course.id)
      useStore.getState().withdrawEnrollmentRequest(requested.id)
      expect(useStore.getState().enrollments.find((e) => e.id === requested.id)?.status).toBe(
        'withdrawn'
      )

      const countBefore = useStore.getState().enrollments.length
      const reRequested = useStore.getState().requestEnrollment(student.id, course.id)

      expect(reRequested.id).toBe(requested.id)
      expect(reRequested.status).toBe('pending')
      expect(useStore.getState().enrollments.length).toBe(countBefore)
    })

    it('short-circuits (no-op) when an approved enrollment already exists', () => {
      const student = getStudent()
      const course = findOpenRequestableCourse(student)

      // Build an approved enrollment: student requests, admin approves.
      useStore.getState().setRole('student')
      const requested = useStore.getState().requestEnrollment(student.id, course.id)
      useStore.getState().setRole('admin')
      const approved = useStore.getState().approveEnrollment(requested.id)
      expect(approved.status).toBe('approved')

      // Re-requesting an approved course is an idempotent no-op: same record back,
      // status untouched, no new enrollment.
      useStore.getState().setRole('student')
      const countBefore = useStore.getState().enrollments.length
      const result = useStore.getState().requestEnrollment(student.id, course.id)

      expect(result.id).toBe(requested.id)
      expect(result.status).toBe('approved')
      expect(useStore.getState().enrollments.length).toBe(countBefore)
    })
  })

  describe('withdrawEnrollmentRequest', () => {
    it('changes pending enrollment status to withdrawn', () => {
      useStore.getState().setRole('student')
      const student = getStudent()

      const browseableCourse = findOpenRequestableCourse(student)

      // Create a pending enrollment
      const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)

      // Withdraw it
      useStore.getState().withdrawEnrollmentRequest(enrollment.id)

      const newState = useStore.getState()
      const updatedEnrollment = newState.enrollments.find((e) => e.id === enrollment.id)
      expect(updatedEnrollment?.status).toBe('withdrawn')
    })

    it('emits an audit entry when request is withdrawn', () => {
      useStore.getState().setRole('student')
      const student = getStudent()

      const browseableCourse = findOpenRequestableCourse(student)

      const enrollment = useStore.getState().requestEnrollment(student.id, browseableCourse.id)
      const initialAuditCount = useStore.getState().auditLog.length

      useStore.getState().withdrawEnrollmentRequest(enrollment.id)

      const newState = useStore.getState()
      expect(newState.auditLog.length).toBe(initialAuditCount + 1)
      if (newState.auditLog[0]) {
        expect(newState.auditLog[0].action).toBe('withdraw')
      }
    })

    it('refuses to withdraw an enrollment the current user does not own', () => {
      useStore.getState().setRole('student')
      const student = getStudent()
      const course = findOpenRequestableCourse(student)
      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      // Re-attribute the record to another student so the ownership guard bites
      // while the caller stays a Student (the only role with the withdraw perm).
      patchEnrollment(enrollment.id, { studentId: 'stu-2' })
      const countBefore = useStore.getState().auditLog.length

      // Ownership is a matrix predicate (ADR-0007), so the denial is assertCan's.
      expect(() => useStore.getState().withdrawEnrollmentRequest(enrollment.id)).toThrow(
        /permission denied/
      )
      expect(useStore.getState().enrollments.find((e) => e.id === enrollment.id)?.status).toBe(
        'pending'
      )
      expect(useStore.getState().auditLog.length).toBe(countBefore)
    })

    it('refuses to withdraw an enrollment that is not pending', () => {
      useStore.getState().setRole('student')
      const student = getStudent()
      const course = findOpenRequestableCourse(student)
      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      // Approve it (admin), then a Student attempt to withdraw the now-approved
      // record must be rejected by the store, not silently flip it to withdrawn.
      useStore.getState().setRole('admin')
      useStore.getState().approveEnrollment(enrollment.id)
      useStore.getState().setRole('student')
      const countBefore = useStore.getState().auditLog.length

      expect(() => useStore.getState().withdrawEnrollmentRequest(enrollment.id)).toThrow(
        /not pending/
      )
      expect(useStore.getState().enrollments.find((e) => e.id === enrollment.id)?.status).toBe(
        'approved'
      )
      expect(useStore.getState().auditLog.length).toBe(countBefore)
    })

    it('reconciles any derived grade / attendance rows on withdrawal', () => {
      useStore.getState().setRole('student')
      const student = getStudent()
      const course = findOpenRequestableCourse(student)
      const enrollment = useStore.getState().requestEnrollment(student.id, course.id)

      // setGrade / markAttendance gate on Course ownership, not enrollment status,
      // so a pending record can accrue derived rows. Stage some directly, then prove
      // the withdrawal cleans them (defense-in-depth) rather than stranding them.
      useStore.setState((s) => ({
        grades: [
          ...s.grades,
          {
            id: 'grade-withdraw-test',
            studentId: student.id,
            courseId: course.id,
            score: 85,
            issuedAt: '2025-06-01T00:00:00.000Z',
          },
        ],
        attendance: [
          ...s.attendance,
          {
            id: 'att-withdraw-test',
            courseId: course.id,
            studentId: student.id,
            sessionDate: '2025-06-01',
            status: 'present',
          },
        ],
      }))

      useStore.getState().withdrawEnrollmentRequest(enrollment.id)

      const after = useStore.getState()
      expect(after.enrollments.find((e) => e.id === enrollment.id)?.status).toBe('withdrawn')
      expect(after.grades.some((g) => g.studentId === student.id && g.courseId === course.id)).toBe(
        false
      )
      expect(
        after.attendance.some((a) => a.studentId === student.id && a.courseId === course.id)
      ).toBe(false)
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
      const scoped = applyScope('courses', 'enrolled', state.courses, state)

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
