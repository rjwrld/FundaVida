import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  AttendanceRecord,
  TcuActivity,
} from '@/types'

export interface ReportsInput {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  tcuActivities: TcuActivity[]
}

export interface Totals {
  students: number
  teachers: number
  courses: number
  enrollments: number
}

export interface EnrollmentByCourse {
  courseId: string
  courseName: string
  count: number
}

export interface AverageGradeByCourse {
  courseId: string
  courseName: string
  average: number | null
}

export interface PresentRateByCourse {
  courseId: string
  courseName: string
  rate: number | null
}

export interface TcuHoursByStudent {
  studentId: string
  studentName: string
  totalHours: number
}

export interface ReportsSnapshot {
  totals: Totals
  enrollmentsByCourse: EnrollmentByCourse[]
  averageGradeByCourse: AverageGradeByCourse[]
  presentRateByCourse: PresentRateByCourse[]
  tcuHoursByStudent: TcuHoursByStudent[]
}

export function buildReports(input: ReportsInput): ReportsSnapshot {
  const { students, teachers, courses, enrollments, grades, attendance, tcuActivities } = input
  const courseName = new Map(courses.map((c) => [c.id, c.name]))
  const studentName = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  const enrollmentsByCourse: EnrollmentByCourse[] = courses
    .map((c) => ({
      courseId: c.id,
      courseName: c.name,
      count: enrollments.filter((e) => e.courseId === c.id).length,
    }))
    .sort((a, b) => b.count - a.count)

  const averageGradeByCourse: AverageGradeByCourse[] = courses
    .map((c) => {
      const scores = grades.filter((g) => g.courseId === c.id).map((g) => g.score)
      const average =
        scores.length === 0 ? null : scores.reduce((sum, s) => sum + s, 0) / scores.length
      return { courseId: c.id, courseName: c.name, average }
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))

  const presentRateByCourse: PresentRateByCourse[] = courses
    .map((c) => {
      const records = attendance.filter((r) => r.courseId === c.id)
      if (records.length === 0) return { courseId: c.id, courseName: c.name, rate: null }
      const present = records.filter((r) => r.status === 'present').length
      return { courseId: c.id, courseName: c.name, rate: present / records.length }
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  const hoursByStudent = new Map<string, number>()
  tcuActivities.forEach((a) => {
    hoursByStudent.set(a.studentId, (hoursByStudent.get(a.studentId) ?? 0) + a.hours)
  })
  const tcuHoursByStudent: TcuHoursByStudent[] = Array.from(hoursByStudent.entries())
    .map(([studentId, totalHours]) => ({
      studentId,
      studentName: studentName.get(studentId) ?? studentId,
      totalHours,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)

  void courseName

  return {
    totals: {
      students: students.length,
      teachers: teachers.length,
      courses: courses.length,
      enrollments: enrollments.length,
    },
    enrollmentsByCourse,
    averageGradeByCourse,
    presentRateByCourse,
    tcuHoursByStudent,
  }
}
