import { faker } from '@faker-js/faker'
import type { Grade, Enrollment } from '@/types'

export function seedGrades(enrollments: Enrollment[]): Grade[] {
  faker.seed(46)
  return enrollments.map((e, i) => ({
    id: `gra-${i + 1}`,
    studentId: e.studentId,
    courseId: e.courseId,
    score: faker.number.int({ min: 55, max: 100 }),
    issuedAt: faker.date.recent({ days: 180 }).toISOString(),
  }))
}
