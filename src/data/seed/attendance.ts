import { faker } from '@faker-js/faker'
import type { AttendanceRecord, AttendanceStatus, Enrollment } from '@/types'

function pickStatus(): AttendanceStatus {
  const roll = faker.number.float({ min: 0, max: 1 })
  if (roll < 0.75) return 'present'
  if (roll < 0.9) return 'absent'
  return 'excused'
}

export function seedAttendance(enrollments: Enrollment[], courseIds: string[]): AttendanceRecord[] {
  faker.seed(48)
  const sessionsByCourse = new Map<string, string[]>()
  courseIds.forEach((cid) => {
    const sessions = Array.from({ length: 5 }, () =>
      faker.date.recent({ days: 90 }).toISOString()
    ).sort((a, b) => (a > b ? -1 : 1))
    sessionsByCourse.set(cid, sessions)
  })

  const records: AttendanceRecord[] = []
  let idCounter = 1
  enrollments.forEach((e) => {
    const sessions = sessionsByCourse.get(e.courseId) ?? []
    sessions.forEach((sessionDate) => {
      records.push({
        id: `att-${idCounter}`,
        courseId: e.courseId,
        studentId: e.studentId,
        sessionDate,
        status: pickStatus(),
      })
      idCounter += 1
    })
  })
  return records
}
