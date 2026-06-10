import { faker } from '@faker-js/faker'
import { startOfDay, subWeeks, addWeeks, subDays, addDays } from 'date-fns'
import type { Course, Weekday } from '@/types'

export function seedCourses(teacherIds: string[], count = 8): Course[] {
  if (teacherIds.length === 0) {
    throw new Error('seedCourses requires at least one teacher id')
  }
  faker.seed(44)
  const hqs = ['San José HQ', 'Heredia HQ', 'Alajuela HQ']
  const programs = ['Literacy', 'Math', 'English', 'Life Skills']
  const weekdayOptions: Weekday[][] = [
    ['mon', 'wed'],
    ['tue', 'thu'],
    ['mon', 'wed', 'fri'],
    ['tue', 'thu'],
    ['mon', 'wed'],
    ['tue', 'thu', 'fri'],
    ['mon', 'wed'],
    ['tue', 'thu'],
  ]

  const today = startOfDay(new Date())

  // Define the 8-course mix:
  // 2 completed (ended 6–16 weeks ago)
  // 1 just-ended (ended within ~10 days)
  // 4 in-progress (straddles today)
  // 1 upcoming (starts within ~2 weeks)
  const termMixes = [
    // Completed course 1 (ended 16 weeks ago)
    { start: subWeeks(today, 24), end: subWeeks(today, 16) },
    // Completed course 2 (ended 12 weeks ago)
    { start: subWeeks(today, 20), end: subWeeks(today, 12) },
    // Just-ended (ended 8 days ago - within 10 day window)
    { start: subWeeks(today, 14), end: subDays(today, 8) },
    // In-progress 1 (started 3 weeks ago, ends in 9 weeks)
    { start: subWeeks(today, 3), end: addWeeks(today, 9) },
    // In-progress 2 (started 5 weeks ago, ends in 7 weeks)
    { start: subWeeks(today, 5), end: addWeeks(today, 7) },
    // In-progress 3 (started 7 weeks ago, ends in 5 weeks)
    { start: subWeeks(today, 7), end: addWeeks(today, 5) },
    // In-progress 4 (started 2 weeks ago, ends in 10 weeks)
    { start: subWeeks(today, 2), end: addWeeks(today, 10) },
    // Upcoming (starts in 10 days, within 2 week window)
    { start: addDays(today, 10), end: addWeeks(today, 14) },
  ]

  return Array.from({ length: count }, (_, i) => {
    const mix = termMixes[i] as { start: Date; end: Date }
    const termStart = mix.start.toISOString()
    const termEnd = mix.end.toISOString()
    const createdDate = subDays(mix.start, faker.number.int({ min: 7, max: 30 }))

    return {
      id: `cou-${i + 1}`,
      name: `${faker.helpers.arrayElement(programs)} ${i + 1}`,
      description: faker.lorem.sentence(),
      headquartersName: faker.helpers.arrayElement(hqs),
      programName: faker.helpers.arrayElement(programs),
      teacherId: teacherIds[i % teacherIds.length] as string,
      term: {
        start: termStart,
        end: termEnd,
      },
      meetingDays: weekdayOptions[i] as Weekday[],
      createdAt: createdDate.toISOString(),
    }
  })
}
