import { faker } from '@faker-js/faker'
import { startOfDay } from 'date-fns'
import type { AttendanceRecord, AttendanceStatus, Enrollment, Course } from '@/types'
import { sessionsFor } from '@/lib/sessions'

function pickStatus(): AttendanceStatus {
  const roll = faker.number.float({ min: 0, max: 1 })
  if (roll < 0.75) return 'present'
  if (roll < 0.9) return 'absent'
  return 'excused'
}

export function seedAttendance(enrollments: Enrollment[], courses: Course[]): AttendanceRecord[] {
  faker.seed(48)

  // Build a map of courseId -> Course for fast lookup
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  const records: AttendanceRecord[] = []
  let idCounter = 1

  const today = startOfDay(new Date())

  enrollments.forEach((e) => {
    const course = courseMap.get(e.courseId)
    if (!course) return

    // Get all sessions for this course
    const sessions = sessionsFor(course)

    // Filter to past sessions (before today)
    const pastSessions = sessions.filter((s) => {
      const sessionDate = startOfDay(new Date(s.date))
      return sessionDate.getTime() < today.getTime()
    })

    // Cap at 10 most recent past sessions (already in ascending order from sessionsFor)
    const sessionsToRecord = pastSessions.slice(-10)

    // Create a record for each past session
    sessionsToRecord.forEach((session) => {
      records.push({
        id: `att-${idCounter}`,
        courseId: e.courseId,
        studentId: e.studentId,
        sessionDate: session.date,
        status: pickStatus(),
      })
      idCounter += 1
    })
  })

  return records
}
