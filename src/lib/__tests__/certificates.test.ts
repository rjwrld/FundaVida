import { describe, it, expect } from 'vitest'
import {
  PASSING_SCORE,
  isPassingScore,
  isCertificateDownloadable,
  emitCertificatesForClose,
} from '../certificates'
import type { Certificate, Course, Enrollment, Grade } from '@/types'

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: 'cert-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    score: 90,
    issuedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 'enr-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    enrolledAt: '2024-01-01T00:00:00.000Z',
    status: 'approved',
    requestedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGrade(overrides: Partial<Grade> = {}): Grade {
  return {
    id: 'gra-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    score: 90,
    issuedAt: '2024-03-01T00:00:00.000Z',
    ...overrides,
  }
}

const course = { id: 'cou-1' } as Course

describe('isPassingScore', () => {
  it('is true at or above the passing score', () => {
    expect(isPassingScore(PASSING_SCORE)).toBe(true)
    expect(isPassingScore(PASSING_SCORE + 5)).toBe(true)
  })

  it('is false below the passing score', () => {
    expect(isPassingScore(PASSING_SCORE - 1)).toBe(false)
  })
})

describe('isCertificateDownloadable', () => {
  // A Certificate now exists iff its Course was closed iff the PDF is available
  // (ADR-0024): existence alone makes it downloadable, no status to consult.
  it('is downloadable because it exists', () => {
    expect(isCertificateDownloadable(makeCertificate())).toBe(true)
  })
})

describe('emitCertificatesForClose', () => {
  it('emits one cert seed per approved-enrolled student with a passing grade', () => {
    const enrollments = [
      makeEnrollment({ id: 'enr-1', studentId: 'stu-1' }),
      makeEnrollment({ id: 'enr-2', studentId: 'stu-2' }),
    ]
    const grades = [
      makeGrade({ id: 'gra-1', studentId: 'stu-1', score: PASSING_SCORE }),
      makeGrade({ id: 'gra-2', studentId: 'stu-2', score: 100 }),
    ]

    const seeds = emitCertificatesForClose(course, enrollments, grades)

    expect(seeds).toHaveLength(2)
    expect(seeds.map((s) => s.studentId).sort()).toEqual(['stu-1', 'stu-2'])
    expect(seeds.every((s) => s.courseId === 'cou-1')).toBe(true)
  })

  it('snapshots the grade score onto the seed', () => {
    const enrollments = [makeEnrollment({ studentId: 'stu-1' })]
    const grades = [makeGrade({ studentId: 'stu-1', score: 88 })]

    const [seed] = emitCertificatesForClose(course, enrollments, grades)

    expect(seed?.score).toBe(88)
  })

  it('emits nothing for a failing grade', () => {
    const enrollments = [makeEnrollment({ studentId: 'stu-1' })]
    const grades = [makeGrade({ studentId: 'stu-1', score: PASSING_SCORE - 1 })]

    expect(emitCertificatesForClose(course, enrollments, grades)).toEqual([])
  })

  it('emits nothing for an enrolled student with no grade', () => {
    const enrollments = [makeEnrollment({ studentId: 'stu-1' })]

    expect(emitCertificatesForClose(course, enrollments, [])).toEqual([])
  })

  it('emits nothing for a passing grade without an approved enrollment', () => {
    const enrollments = [makeEnrollment({ studentId: 'stu-1', status: 'withdrawn' })]
    const grades = [makeGrade({ studentId: 'stu-1', score: 95 })]

    expect(emitCertificatesForClose(course, enrollments, grades)).toEqual([])
  })

  it('ignores grades and enrollments from other courses', () => {
    const enrollments = [
      makeEnrollment({ studentId: 'stu-1', courseId: 'cou-1' }),
      makeEnrollment({ studentId: 'stu-2', courseId: 'cou-OTHER' }),
    ]
    const grades = [
      makeGrade({ studentId: 'stu-1', courseId: 'cou-1', score: 90 }),
      makeGrade({ studentId: 'stu-2', courseId: 'cou-OTHER', score: 90 }),
    ]

    const seeds = emitCertificatesForClose(course, enrollments, grades)

    expect(seeds).toHaveLength(1)
    expect(seeds[0]?.studentId).toBe('stu-1')
  })
})
