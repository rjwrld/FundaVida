import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { PASSING_SCORE } from '@/lib/certificates'

/** An enrolled (student, course) pair that has no Certificate yet. */
function freshPair() {
  const { enrollments, certificates } = useStore.getState()
  const pair = enrollments.find(
    (e) => !certificates.some((c) => c.studentId === e.studentId && c.courseId === e.courseId)
  )
  if (!pair) throw new Error('seed has no enrollment without a certificate')
  return { studentId: pair.studentId, courseId: pair.courseId }
}

describe('certificates — passing grade creates a pending certificate', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('creates a pending certificate when a passing grade is saved', () => {
    const { studentId, courseId } = freshPair()
    useStore.getState().setGrade(studentId, courseId, PASSING_SCORE)

    const cert = useStore
      .getState()
      .certificates.find((c) => c.studentId === studentId && c.courseId === courseId)
    expect(cert).toBeDefined()
    expect(cert?.status).toBe('pending')
    expect(cert?.score).toBe(PASSING_SCORE)
  })

  it('does not create a certificate for a failing grade', () => {
    const { studentId, courseId } = freshPair()
    useStore.getState().setGrade(studentId, courseId, PASSING_SCORE - 1)

    const cert = useStore
      .getState()
      .certificates.find((c) => c.studentId === studentId && c.courseId === courseId)
    expect(cert).toBeUndefined()
  })

  it('does not create a second certificate when the passing grade is re-saved', () => {
    const { studentId, courseId } = freshPair()
    useStore.getState().setGrade(studentId, courseId, PASSING_SCORE)
    useStore.getState().setGrade(studentId, courseId, 95)

    const certs = useStore
      .getState()
      .certificates.filter((c) => c.studentId === studentId && c.courseId === courseId)
    expect(certs).toHaveLength(1)
  })
})

describe('certificates — admin approves a pending certificate', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  function seedPendingCertificate(): string {
    useStore.getState().setRole('admin')
    const { studentId, courseId } = freshPair()
    useStore.getState().setGrade(studentId, courseId, PASSING_SCORE)
    const cert = useStore
      .getState()
      .certificates.find((c) => c.studentId === studentId && c.courseId === courseId)
    if (!cert) throw new Error('expected a pending certificate to exist')
    return cert.id
  }

  it('flips status to approved and stamps the approver, with an audit entry', () => {
    const id = seedPendingCertificate()
    const auditBefore = useStore.getState().auditLog.length

    useStore.getState().approveCertificate(id)

    const cert = useStore.getState().certificates.find((c) => c.id === id)
    expect(cert?.status).toBe('approved')
    expect(cert?.approvedAt).toBeTruthy()
    expect(cert?.approvedBy).toBe('admin')
    const entry = useStore.getState().auditLog[0]
    expect(entry?.action).toBe('approve')
    expect(entry?.entity).toBe('certificate')
    expect(entry?.entityId).toBe(id)
    expect(useStore.getState().auditLog.length).toBe(auditBefore + 1)
  })

  it('refuses approval for a student', () => {
    const id = seedPendingCertificate()
    useStore.getState().setRole('student')
    expect(() => useStore.getState().approveCertificate(id)).toThrow(/permission denied/i)
    expect(useStore.getState().certificates.find((c) => c.id === id)?.status).toBe('pending')
  })
})

describe('certificates — a teacher approves only their own courses', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  /**
   * Seed a pending certificate in a course matching `ownedByTea1`: as admin, find an
   * un-certified enrollment in such a course and save a passing grade for it.
   */
  function seedPendingCertificate(ownedByTea1: boolean): string {
    useStore.getState().setRole('admin')
    const { enrollments, certificates, courses } = useStore.getState()
    const courseIds = new Set(
      courses.filter((c) => (c.teacherId === 'tea-1') === ownedByTea1).map((c) => c.id)
    )
    const pair = enrollments.find(
      (e) =>
        courseIds.has(e.courseId) &&
        !certificates.some((c) => c.studentId === e.studentId && c.courseId === e.courseId)
    )
    if (!pair) throw new Error('seed has no un-certified enrollment matching the course filter')
    useStore.getState().setGrade(pair.studentId, pair.courseId, PASSING_SCORE)
    const cert = useStore
      .getState()
      .certificates.find((c) => c.studentId === pair.studentId && c.courseId === pair.courseId)
    if (!cert) throw new Error('expected a pending certificate to exist')
    return cert.id
  }

  it('approves a pending certificate in a course the teacher owns', () => {
    const id = seedPendingCertificate(true)
    useStore.getState().setRole('teacher') // currentUserId === 'tea-1'

    useStore.getState().approveCertificate(id)

    const cert = useStore.getState().certificates.find((c) => c.id === id)
    expect(cert?.status).toBe('approved')
    expect(cert?.approvedBy).toBe('tea-1')
  })

  it('refuses to approve a certificate in another teacher’s course', () => {
    const id = seedPendingCertificate(false)
    useStore.getState().setRole('teacher') // currentUserId === 'tea-1'

    expect(() => useStore.getState().approveCertificate(id)).toThrow(/permission denied/i)
    expect(useStore.getState().certificates.find((c) => c.id === id)?.status).toBe('pending')
  })
})
