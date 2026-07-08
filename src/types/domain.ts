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
 * The relationship a Student's Encargado (guardian) has to them (CONTEXT.md:
 * Encargado). Spanish model tokens; the UI renders them through t() (bilingual).
 */
export type GuardianRelationship = 'madre' | 'padre' | 'tutor' | 'otro'

/**
 * The schooling stage a Course targets. Each Course is exactly one level
 * (ADR-0020, superseding ADR-0016's `'both'`): a Student only sees and enrolls
 * in Courses matching their own level. Bilingual via t(), unlike the
 * Spanish-only program names.
 */
export type CourseLevel = 'primaria' | 'secundaria'

/**
 * A Course's lifecycle state: a Teacher authors in `'draft'` and publishes when
 * ready (ADR-0016; Students never see drafts), then deliberately `'closed'`s the
 * cohort once it is over (ADR-0024) — a stored ceremony distinct from the
 * derived "ended" (Term end-date passed). `'closed'` is reached only through the
 * `closeCourse` action, never the authoring form. Bilingual via t().
 */
export type CourseStatus = 'draft' | 'published' | 'closed'

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

/** The adult responsible for a Student (CONTEXT.md: Encargado). Students are
 * minors, so every Student has exactly one. */
export interface Guardian {
  name: string
  relationship: GuardianRelationship
  phone: string
  email: string
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
  guardian: Guardian
  enrolledCourseIds: string[]
  createdAt: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  sede: Sede
  province: string
  canton: string
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

/**
 * Recognition of a passing Grade (CONTEXT.md: Certificate). Emitted when the
 * Course is closed (ADR-0024), one per enrolled Student with a passing Grade,
 * with the Grade's `score` snapshotted. A Certificate exists iff its Course was
 * closed iff the PDF is available — there is no undownloadable state to model,
 * so there is no `status`.
 */
export interface Certificate {
  id: string
  studentId: string
  courseId: string
  score: number
  /** When the Course was closed and this Certificate emitted — dates the PDF. */
  issuedAt: string
}

export type TcuActivityStatus = 'pending' | 'approved' | 'rejected'

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

/**
 * The kind of deviation a {@link SessionException} records (ADR-0039):
 * `'cancelled'` drops a derived Session, `'rescheduled'` moves it to `newDate`,
 * and `'extra'` adds a Session on a date the base derivation never produced.
 */
export type SessionExceptionType = 'cancelled' | 'rescheduled' | 'extra'

/**
 * A sparse, stored fact about a deviation from a Course's derived Sessions
 * (ADR-0039). Sessions themselves stay derived (Term × Meeting Days, ADR-0001) —
 * an exception is never a Session row, only an overlay applied last by
 * `effectiveSessions`. `date` names the base Session being cancelled/moved (or the
 * added date for `'extra'`); `newDate` is the reschedule target (present only for
 * `'rescheduled'`). Future-only and attendance-guarded at the store (ADR-0009).
 */
export interface SessionException {
  id: string
  courseId: string
  type: SessionExceptionType
  /** The base Session's date being cancelled/moved, or the added date for `'extra'`. */
  date: string
  /** The reschedule target — present only when `type === 'rescheduled'`. */
  newDate?: string
  /** Optional teacher note explaining the deviation. */
  note?: string
  createdAt: string
}

/**
 * How an {@link Announcement} came to exist (ADR-0040): `'manual'` is a Teacher
 * (or admin) typing into the Course feed; `'sessionChange'` is auto-posted by the
 * session-exception mutation (ADR-0039) so a schedule change is never typed twice.
 */
export type AnnouncementKind = 'manual' | 'sessionChange'

/**
 * A course-scoped feed post (ADR-0040): its audience is exactly the Course's
 * roster (admin all, the Course's Teacher, enrolled Students, the assigned TCU
 * volunteer — the same visibility as the Course itself, read through the scope
 * seam). `body` is free content, never passed through t(): a `'manual'` post is
 * whatever the Teacher typed; a `'sessionChange'` post is a sentence derived from
 * the exception in the store's active locale at post time. There is no edit — a
 * correction is a new post — so the audit story stays append-only.
 */
export interface Announcement {
  id: string
  courseId: string
  body: string
  kind: AnnouncementKind
  createdAt: string
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'enroll'
  | 'requestEnroll'
  | 'unenroll'
  | 'withdraw'
  | 'grade'
  | 'approve'
  | 'close'
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
  | 'session'
  | 'announcement'

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

/**
 * Who a campaign is addressed to (ADR-0041). `resolveRecipients` still resolves
 * the target Students; the audience maps each to recipient emails — their own
 * ('students'), their Encargado's ('guardians'), or both ('both'). Counts are
 * over emails, not Students, so 'both' is not double-counting.
 */
export type EmailAudience = 'students' | 'guardians' | 'both'

export interface EmailCampaign {
  id: string
  subject: string
  body: string
  filter: EmailFilter
  audience: EmailAudience
  recipientIds: string[]
  sentAt: string
  sentBy: string
}
