import type { Grade, Student, Course } from '@/types'

export interface EligibleCertificate {
  studentId: string
  courseId: string
  score: number
  issuedAt: string
}

export const PASSING_SCORE = 70

export function buildEligibleList(
  students: Student[],
  courses: Course[],
  grades: Grade[]
): EligibleCertificate[] {
  const studentMap = new Map(students.map((s) => [s.id, s]))
  const courseMap = new Map(courses.map((c) => [c.id, c]))
  return grades
    .filter((g) => g.score >= PASSING_SCORE)
    .filter((g) => studentMap.has(g.studentId) && courseMap.has(g.courseId))
    .map((g) => ({
      studentId: g.studentId,
      courseId: g.courseId,
      score: g.score,
      issuedAt: g.issuedAt,
    }))
}
