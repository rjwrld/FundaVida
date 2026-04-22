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

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface AttendanceRecord {
  id: string
  courseId: string
  studentId: string
  sessionDate: string
  status: AttendanceStatus
}

export type AuditAction = 'create' | 'update' | 'delete' | 'enroll' | 'unenroll' | 'grade'

export type AuditEntity = 'student' | 'teacher' | 'course' | 'enrollment' | 'grade'

export interface AuditLogEntry {
  id: string
  actorId: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  timestamp: string
  summary: string
}
