import { faker } from '@faker-js/faker'
import type { Student } from '@/types'

export function seedStudents(count = 24): Student[] {
  faker.seed(42)
  const provinces = ['San José', 'Heredia', 'Alajuela', 'Cartago']
  const levels = ['Primary', 'Secondary', 'University']
  return Array.from({ length: count }, (_, i) => ({
    id: `stu-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    gender: faker.helpers.arrayElement(['F', 'M', 'X'] as const),
    province: faker.helpers.arrayElement(provinces),
    canton: faker.location.city(),
    educationalLevel: faker.helpers.arrayElement(levels),
    enrolledCourseIds: [],
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  }))
}
