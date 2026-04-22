import { faker } from '@faker-js/faker'
import type { AuditLogEntry, Student, Teacher, Course, Enrollment, Grade } from '@/types'

export function seedAuditLog(input: {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
}): AuditLogEntry[] {
  faker.seed(49)
  const { students, teachers, courses, enrollments, grades } = input
  const entries: AuditLogEntry[] = []
  let idCounter = 1

  students.slice(0, 12).forEach((s) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'student',
      entityId: s.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created student ${s.firstName} ${s.lastName}`,
    })
  })
  teachers.slice(0, 3).forEach((t) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'teacher',
      entityId: t.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created teacher ${t.firstName} ${t.lastName}`,
    })
  })
  courses.slice(0, 4).forEach((c) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'course',
      entityId: c.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created course ${c.name}`,
    })
  })
  enrollments.slice(0, 8).forEach((e) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'enroll',
      entity: 'enrollment',
      entityId: e.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Enrolled student ${e.studentId} in course ${e.courseId}`,
    })
  })
  grades.slice(0, 10).forEach((g) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'tea-1',
      action: 'grade',
      entity: 'grade',
      entityId: g.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Graded student ${g.studentId} in course ${g.courseId} with ${g.score}`,
    })
  })

  return entries.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
}
