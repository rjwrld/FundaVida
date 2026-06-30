import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { PASSING_SCORE } from '@/lib/certificates'

/**
 * A published Course with at least three approved enrollments and no Certificates
 * yet — the runway for the close ceremony (one passing, one failing, one ungraded).
 */
function publishedCourseWithApprovedEnrollments() {
  const { courses, enrollments, certificates, grades } = useStore.getState()
  for (const course of courses.filter((c) => c.status === 'published')) {
    if (certificates.some((c) => c.courseId === course.id)) continue
    // No seeded grades, so the test controls exactly who passes / fails / is ungraded.
    if (grades.some((g) => g.courseId === course.id)) continue
    const approved = enrollments.filter((e) => e.courseId === course.id && e.status === 'approved')
    if (approved.length >= 3) return { course, approved }
  }
  throw new Error('seed has no ungraded published course with three approved enrollments')
}

describe('certificates — closing a Course emits certificates', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('emits one downloadable certificate per passing enrolled student, none for failing or ungraded', () => {
    const { course, approved } = publishedCourseWithApprovedEnrollments()
    const [passing, failing, ungraded] = approved
    if (!passing || !failing || !ungraded) throw new Error('expected three approved enrollments')
    useStore.getState().setGrade(passing.studentId, course.id, PASSING_SCORE)
    useStore.getState().setGrade(failing.studentId, course.id, PASSING_SCORE - 1)

    useStore.getState().closeCourse(course.id)

    const certs = useStore.getState().certificates.filter((c) => c.courseId === course.id)
    expect(certs).toHaveLength(1)
    const cert = certs[0]
    expect(cert?.studentId).toBe(passing.studentId)
    expect(cert?.score).toBe(PASSING_SCORE)
    expect(cert?.issuedAt).toBeTruthy()
    // No cert for the failing or the ungraded student.
    expect(certs.some((c) => c.studentId === failing.studentId)).toBe(false)
    expect(certs.some((c) => c.studentId === ungraded.studentId)).toBe(false)
  })

  it('flips the Course to closed and records a single close audit entry alongside the certs', () => {
    const { course, approved } = publishedCourseWithApprovedEnrollments()
    const [first] = approved
    if (!first) throw new Error('expected an approved enrollment')
    useStore.getState().setGrade(first.studentId, course.id, 95)
    const auditBefore = useStore.getState().auditLog.length

    useStore.getState().closeCourse(course.id)

    expect(useStore.getState().courses.find((c) => c.id === course.id)?.status).toBe('closed')
    // One mutation: the status flip and the cert emission share one audit cycle.
    expect(useStore.getState().auditLog.length).toBe(auditBefore + 1)
    const entry = useStore.getState().auditLog[0]
    expect(entry?.action).toBe('close')
    expect(entry?.entity).toBe('course')
    expect(useStore.getState().certificates.some((c) => c.courseId === course.id)).toBe(true)
  })

  it('does not emit a certificate for a passing grade on a non-approved enrollment', () => {
    const { courses, enrollments, certificates } = useStore.getState()
    // A published, cert-free course whose roster includes a withdrawn enrollment.
    let target: { courseId: string; studentId: string } | undefined
    for (const course of courses.filter((c) => c.status === 'published')) {
      if (certificates.some((c) => c.courseId === course.id)) continue
      const withdrawn = enrollments.find(
        (e) => e.courseId === course.id && e.status === 'withdrawn'
      )
      if (withdrawn) {
        target = { courseId: course.id, studentId: withdrawn.studentId }
        break
      }
    }
    if (!target) throw new Error('seed lacks a published course with a withdrawn enrollment')
    const { courseId, studentId } = target
    useStore.getState().setGrade(studentId, courseId, 95)

    useStore.getState().closeCourse(courseId)

    const cert = useStore
      .getState()
      .certificates.find((c) => c.courseId === courseId && c.studentId === studentId)
    expect(cert).toBeUndefined()
  })

  it('refuses to close (and emit) for a student', () => {
    const { course } = publishedCourseWithApprovedEnrollments()
    useStore.getState().setRole('student')
    expect(() => useStore.getState().closeCourse(course.id)).toThrow(/permission denied/i)
  })
})

describe('certificates — saving a grade no longer emits a certificate', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('creates no certificate when a passing grade is saved (emission waits for close)', () => {
    const { course, approved } = publishedCourseWithApprovedEnrollments()
    const [first] = approved
    if (!first) throw new Error('expected an approved enrollment')
    const studentId = first.studentId
    const before = useStore.getState().certificates.length

    useStore.getState().setGrade(studentId, course.id, PASSING_SCORE)

    expect(useStore.getState().certificates.length).toBe(before)
    expect(
      useStore
        .getState()
        .certificates.some((c) => c.studentId === studentId && c.courseId === course.id)
    ).toBe(false)
  })
})
