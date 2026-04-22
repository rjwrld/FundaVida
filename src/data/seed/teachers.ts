import { faker } from '@faker-js/faker'
import type { Teacher } from '@/types'

export function seedTeachers(count = 6): Teacher[] {
  faker.seed(43)
  return Array.from({ length: count }, (_, i) => ({
    id: `tea-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    courseIds: [],
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  }))
}
