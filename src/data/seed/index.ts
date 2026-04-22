import { seedStudents } from './students'
import { seedTeachers } from './teachers'
import { seedCourses } from './courses'
import { seedEnrollments } from './enrollments'
import { seedGrades } from './grades'
import { seedTcuActivities } from './tcuActivities'
import type { Student, Teacher, Course, Enrollment, Grade, TcuActivity } from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
}

export function buildSeedSnapshot(): SeedSnapshot {
  const teachers = seedTeachers()
  const teacherIds = teachers.map((t) => t.id)
  const courses = seedCourses(teacherIds)

  courses.forEach((c) => {
    const teacher = teachers.find((t) => t.id === c.teacherId)
    if (teacher && !teacher.courseIds.includes(c.id)) teacher.courseIds.push(c.id)
  })

  const students = seedStudents()
  const studentIds = students.map((s) => s.id)
  const courseIds = courses.map((c) => c.id)
  const enrollments = seedEnrollments(studentIds, courseIds)

  enrollments.forEach((e) => {
    const student = students.find((s) => s.id === e.studentId)
    if (student && !student.enrolledCourseIds.includes(e.courseId)) {
      student.enrolledCourseIds.push(e.courseId)
    }
  })

  const grades = seedGrades(enrollments)
  const tcuActivities = seedTcuActivities(studentIds)
  return { students, teachers, courses, enrollments, grades, tcuActivities }
}
