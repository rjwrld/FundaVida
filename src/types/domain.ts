export type Role = 'admin' | 'teacher' | 'student' | 'tcu'

export type Gender = 'F' | 'M' | 'X'

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: Gender
  province: string
  canton: string
  educationalLevel: string
  enrolledCourseIds: string[]
  createdAt: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  courseIds: string[]
  createdAt: string
}

export interface Course {
  id: string
  name: string
  description: string
  headquartersName: string
  programName: string
  teacherId: string
  createdAt: string
}

export interface Enrollment {
  id: string
  studentId: string
  courseId: string
  enrolledAt: string
}

export interface Grade {
  id: string
  studentId: string
  courseId: string
  score: number
  issuedAt: string
}

export interface TcuActivity {
  id: string
  studentId: string
  title: string
  description: string
  hours: number
  date: string
  organizerId?: string
}
