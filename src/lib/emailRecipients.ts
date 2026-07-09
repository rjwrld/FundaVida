import type { TFunction } from 'i18next'
import type {
  Course,
  EmailAudience,
  EmailCampaign,
  EmailFilter,
  Enrollment,
  Program,
  Student,
  Teacher,
} from '@/types'

export interface RecipientInput {
  students: Student[]
  courses: Course[]
  enrollments: Enrollment[]
}

export function resolveRecipients(filter: EmailFilter, input: RecipientInput): Student[] {
  const { students, courses, enrollments } = input
  if (filter.kind === 'all') return students
  if (filter.kind === 'program' && filter.value) {
    // The program filter targets a Program by id (ADR-0015); value is a programId.
    const programCourseIds = new Set(
      courses.filter((c) => c.programId === filter.value).map((c) => c.id)
    )
    const enrolledStudentIds = new Set(
      enrollments.filter((e) => programCourseIds.has(e.courseId)).map((e) => e.studentId)
    )
    return students.filter((s) => enrolledStudentIds.has(s.id))
  }
  if (filter.kind === 'province' && filter.value) {
    return students.filter((s) => s.province === filter.value)
  }
  if (filter.kind === 'course' && filter.value) {
    const ids = new Set(
      enrollments.filter((e) => e.courseId === filter.value).map((e) => e.studentId)
    )
    return students.filter((s) => ids.has(s.id))
  }
  return []
}

export interface EmailFilterNames {
  programs: Program[]
  courses: Course[]
}

/**
 * Describe a campaign's recipient filter for a reader: the filter kind, plus the
 * thing it targets. The `program` and `course` filters store ids (ADR-0015), so
 * they are resolved to names here — the one place that translation lives, now that
 * the history table and the preview dialog's chrome both need it. A `province`
 * filter already stores the place name, and `all` targets nothing.
 *
 * The Course resolves to the canonical `course.name`, Sede segment and all — not
 * `shortCourseName`. Bulk email is a Sede-less, cross-Sede admin surface (ADR-0021),
 * so the bare display name collides: the three "Alfabetización Primaria (ene 2026)"
 * cohorts differ only by the Sede that stripping would drop.
 *
 * An id whose entity is gone falls through to the raw value: a campaign is a
 * historical record and outlives the Program or Course it was sent to.
 */
export function emailFilterLabel(
  filter: EmailFilter,
  { programs, courses }: EmailFilterNames,
  t: TFunction
): string {
  const kind = t(`bulkEmail.filter.${filter.kind}`)
  if (!filter.value) return kind
  let target = filter.value
  if (filter.kind === 'program') {
    target = programs.find((p) => p.id === filter.value)?.name ?? filter.value
  } else if (filter.kind === 'course') {
    target = courses.find((c) => c.id === filter.value)?.name ?? filter.value
  }
  return `${kind}: ${target}`
}

export interface CampaignSenderNames {
  teachers: Teacher[]
}

/**
 * Name the user a campaign was sent by, for a reader — `EmailCampaign.sentBy` is
 * a `currentUserId`, and the app's user ids are not names.
 *
 * `sentBy` is not uniformly an entity id, so an id → name lookup is not enough.
 * `admin` and the `system` send-time fallback are **sentinels**: no record carries
 * either as an id, so both resolve to a localized label rather than to nothing. A
 * Teacher id resolves to that Teacher's name.
 *
 * An id whose Teacher is gone falls through to the raw value, exactly as
 * `emailFilterLabel` reasons about a deleted Course: a campaign is a historical
 * record and outlives the person who sent it.
 */
export function campaignSenderLabel(
  sentBy: string,
  { teachers }: CampaignSenderNames,
  t: TFunction
): string {
  if (sentBy === 'admin') return t('bulkEmail.sender.admin')
  if (sentBy === 'system') return t('bulkEmail.sender.system')
  const teacher = teachers.find((x) => x.id === sentBy)
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : sentBy
}

/**
 * Map resolved Students to the distinct email addresses a campaign reaches, given
 * its audience (ADR-0041). This is the sibling step to `resolveRecipients` — that
 * one stays Student-typed and unchanged; this one turns Students into emails:
 *   - 'students'  → each Student's own email
 *   - 'guardians' → each Student's Encargado's email
 *   - 'both'      → both, per Student
 *
 * Emails are de-duplicated (siblings share one Encargado, so a 'guardians' or
 * 'both' send reaches that adult once), preserving first-seen order. The result's
 * length is the "recipient count" the preview and history rows show — emails, not
 * Students, so 'both' is an honest count rather than 2× the roster.
 */
export function recipientEmails(students: Student[], audience: EmailAudience): string[] {
  const seen = new Set<string>()
  const emails: string[] = []
  const push = (email: string) => {
    if (!seen.has(email)) {
      seen.add(email)
      emails.push(email)
    }
  }
  for (const student of students) {
    if (audience === 'students' || audience === 'both') push(student.email)
    if (audience === 'guardians' || audience === 'both') push(student.guardian.email)
  }
  return emails
}

/**
 * How many distinct email addresses a sent campaign reaches among the recipients
 * `studentById` can resolve — emails, not Students (ADR-0041).
 *
 * This is **reconstructed, not recorded**: ADR-0041 stores `recipientIds`, never a
 * count, so a recipient missing from the index is a recipient not counted. The
 * answer is therefore relative to the caller's index, and two callers can honestly
 * disagree: `BulkEmailPage` indexes the raw store, a Course's outbox (ADR-0046)
 * indexes the scope seam, and a Student who has left the reader's scope silently
 * leaves their count. It is not the count at send time. See ADR-0046's consequences
 * for why recording that number instead is out of scope.
 *
 * Both surfaces read this one formula, so neither invents its own arithmetic.
 */
export function sentRecipientCount(
  campaign: Pick<EmailCampaign, 'recipientIds' | 'audience'>,
  studentById: Map<string, Student>
): number {
  const recipients = campaign.recipientIds
    .map((id) => studentById.get(id))
    .filter((s) => s !== undefined)
  return recipientEmails(recipients, campaign.audience).length
}
