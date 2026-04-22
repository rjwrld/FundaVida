import { faker } from '@faker-js/faker'
import type { Enrollment } from '@/types'

export function seedEnrollments(studentIds: string[], courseIds: string[]): Enrollment[] {
  faker.seed(45)
  const enrollments: Enrollment[] = []
  studentIds.forEach((sid, si) => {
    const take = faker.number.int({ min: 1, max: 3 })
    const picked = faker.helpers.arrayElements(courseIds, take)
    picked.forEach((cid, ci) => {
      enrollments.push({
        id: `enr-${si + 1}-${ci + 1}`,
        studentId: sid,
        courseId: cid,
        enrolledAt: faker.date.past({ years: 1 }).toISOString(),
      })
    })
  })
  return enrollments
}
