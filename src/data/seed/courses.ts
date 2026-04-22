import { faker } from '@faker-js/faker'
import type { Course } from '@/types'

export function seedCourses(teacherIds: string[], count = 8): Course[] {
  if (teacherIds.length === 0) {
    throw new Error('seedCourses requires at least one teacher id')
  }
  faker.seed(44)
  const hqs = ['San José HQ', 'Heredia HQ', 'Alajuela HQ']
  const programs = ['Literacy', 'Math', 'English', 'Life Skills']
  return Array.from({ length: count }, (_, i) => ({
    id: `cou-${i + 1}`,
    name: `${faker.helpers.arrayElement(programs)} ${i + 1}`,
    description: faker.lorem.sentence(),
    headquartersName: faker.helpers.arrayElement(hqs),
    programName: faker.helpers.arrayElement(programs),
    teacherId: teacherIds[i % teacherIds.length] as string,
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  }))
}
