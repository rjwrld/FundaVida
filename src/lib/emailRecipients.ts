import type { Course, EmailAudience, EmailFilter, Enrollment, Student } from '@/types'

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
