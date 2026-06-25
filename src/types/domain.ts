import type { Sede } from '@/constants/sede'

export type Role = 'admin' | 'teacher' | 'student' | 'tcu'

export type Gender = 'F' | 'M' | 'X'

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface Term {
  start: string
  end: string
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: Gender
  sede: Sede
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
  sede: Sede
  courseIds: string[]
  createdAt: string
}

export interface TcuTrainee {
  id: string
  firstName: string
  lastName: string
  email: string
  sede: Sede
  createdAt: string
}

export interface Course {
  id: string
  name: string
  description: string
  sede: Sede
  programName: string
  teacherId: string
  term: Term
  meetingDays: Weekday[]
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

export type CertificateStatus = 'pending' | 'approved'

/**
 * Recognition of a passing Grade (CONTEXT.md: Certificate). Created automatically
 * as `pending` when the passing Grade is saved; an admin approval flips it to
 * `approved`, which is what makes the PDF available.
 */
export interface Certificate {
  id: string
  studentId: string
  courseId: string
  score: number
  status: CertificateStatus
  /** When the passing Grade that earned this Certificate was saved. */
  createdAt: string
  /** When an admin approved it — drives the PDF's issue date. Absent while pending. */
  approvedAt?: string
  /** The admin who approved it. Absent while pending. */
  approvedBy?: string
}

export interface TcuActivity {
  id: string
  traineeId: string
  title: string
  hours: number
  date: string
}

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface AttendanceRecord {
  id: string
  courseId: string
  studentId: string
  sessionDate: string
  status: AttendanceStatus
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'enroll'
  | 'unenroll'
  | 'grade'
  | 'approve'
  | 'log'

export type AuditEntity =
  | 'student'
  | 'teacher'
  | 'course'
  | 'enrollment'
  | 'grade'
  | 'certificate'
  | 'emailCampaign'
  | 'tcuActivity'

export interface AuditLogEntry {
  id: string
  actorId: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  timestamp: string
  summary: string
}

export type EmailFilterKind = 'all' | 'program' | 'province' | 'course'

export interface EmailFilter {
  kind: EmailFilterKind
  value?: string
}

export interface EmailCampaign {
  id: string
  subject: string
  body: string
  filter: EmailFilter
  recipientIds: string[]
  sentAt: string
  sentBy: string
}
