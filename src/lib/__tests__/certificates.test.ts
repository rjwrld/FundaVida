import { describe, it, expect } from 'vitest'
import { buildEligibleList, PASSING_SCORE } from '../certificates'
import type { Grade, Student, Course } from '@/types'

const student: Student = {
  id: 'stu-1',
  firstName: 'A',
  lastName: 'B',
  email: 'a@b',
  gender: 'F',
  province: 'X',
  canton: 'Y',
  educationalLevel: 'Primary',
  enrolledCourseIds: ['cou-1'],
  createdAt: new Date().toISOString(),
}
const course: Course = {
  id: 'cou-1',
  name: 'Name',
  description: 'Desc',
  headquartersName: 'HQ',
  programName: 'Program',
  teacherId: 'tea-1',
  createdAt: new Date().toISOString(),
}

describe('buildEligibleList', () => {
  it('includes grades at or above the passing score', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-1',
      courseId: 'cou-1',
      score: PASSING_SCORE,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g]).length).toBe(1)
  })

  it('excludes grades below passing', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-1',
      courseId: 'cou-1',
      score: PASSING_SCORE - 1,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g])).toEqual([])
  })

  it('excludes grades referencing missing student or course', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-does-not-exist',
      courseId: 'cou-1',
      score: 95,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g])).toEqual([])
  })
})
