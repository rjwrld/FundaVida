import { faker } from '@faker-js/faker'
import type { TcuActivity } from '@/types'

const ACTIVITY_TITLES = [
  'Community library reading day',
  'Park cleanup campaign',
  'Elderly home visit',
  'School supply drive',
  'Environmental awareness workshop',
  'Food bank volunteering',
  'Youth tutoring session',
  'Public health awareness fair',
]

export function seedTcuActivities(studentIds: string[]): TcuActivity[] {
  faker.seed(47)
  const activities: TcuActivity[] = []
  let idCounter = 1
  studentIds.forEach((sid) => {
    const count = faker.number.int({ min: 1, max: 4 })
    for (let i = 0; i < count; i += 1) {
      const title = faker.helpers.arrayElement(ACTIVITY_TITLES)
      activities.push({
        id: `tcu-act-${idCounter}`,
        studentId: sid,
        title,
        description: faker.lorem.sentence({ min: 8, max: 14 }),
        hours: faker.number.int({ min: 2, max: 8 }),
        date: faker.date.past({ years: 1 }).toISOString(),
        organizerId: faker.datatype.boolean(0.7) ? 'tcu-1' : undefined,
      })
      idCounter += 1
    }
  })
  return activities
}
