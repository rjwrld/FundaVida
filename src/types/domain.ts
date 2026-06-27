import type { Sede } from '@/constants/sede'

export type Role = 'admin' | 'teacher' | 'student' | 'tcu'

export type Gender = 'F' | 'M' | 'X'

/**
 * A Student's schooling stage (CONTEXT.md: Educational Level). The foundation
 * serves through secondary only — there is no university level. The tokens are
 * the Spanish model values; the UI renders them through t() (bilingual).
 */
export type EducationalLevel = 'primaria' | 'secundaria'

/**
 * The schooling stage a Course targets. `'both'` admits Students of either
 * level (ADR-0016). Bilingual via t(), unlike the Spanish-only program names.
 */
export type CourseLevel = 'primaria' | 'secundaria' | 'both'

/**
 * A Course's publication state (ADR-0016): a Teacher authors in `'draft'` and
 * publishes when ready; Students never see drafts. Bilingual via t().
 */
export type CourseStatus = 'draft' | 'published'

/**
 * The enrollment approval lifecycle (ADR-0016): a Student self-enrolls into
 * `'pending'`; a Teacher/admin direct-enroll lands in `'approved'`. Bilingual
 * via t().
 */
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

/**
 * A first-class catalog entity (ADR-0015): the foundation's fixed roster of
 * programs, each the thing a Course is one cohort of. Org-wide and read-only —
 * never Sede- or role-scoped. `name` and `description` are Spanish-only catalog
 * content and are never passed through t().
 */
export interface Program {
  id: string
  name: string
  description: string
}

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
  educationalLevel: EducationalLevel
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
  /** The volunteer's university — a Spanish proper noun, never passed through t() (ADR-0017). */
  university: string
  /** The single Course the volunteer is assigned to; shares the Course's Sede (ADR-0017). */
  courseId: string
  createdAt: string
}

export interface Course {
  id: string
  name: string
  description: string
  sede: Sede
  /** References a {@link Program} by id (ADR-0015) — never a name string. */
  programId: string
  /** The schooling stage this Course targets (ADR-0016). */
  level: CourseLevel
  /** Publication state the Teacher controls; Students never see drafts (ADR-0016). */
  status: CourseStatus
  /** Seat cap: approval is blocked once the approved count reaches it (ADR-0016). */
  capacity: number
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
  /** Approval lifecycle state (ADR-0016). */
  status: EnrollmentStatus
  /** When the enrollment was requested (a self-enroll) or directly created. */
  requestedAt: string
  /** The Teacher/admin who approved or rejected it. Absent while pending. */
  decidedBy?: string
  /** When it was approved or rejected. Absent while pending. */
  decidedAt?: string
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

export type TcuActivityStatus = 'pending' | 'approved'

export interface TcuActivity {
  id: string
  traineeId: string
  title: string
  hours: number
  date: string
  /** Approval lifecycle: `'pending'` by default; the Course's Teacher approves (ADR-0017). */
  status: TcuActivityStatus
  /** The Teacher/admin who approved it. Absent while pending. */
  approvedBy?: string
  /** When it was approved. Absent while pending. */
  approvedAt?: string
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
  | 'attendance'
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
