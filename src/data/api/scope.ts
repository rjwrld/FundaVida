import type { Scope } from '@/permissions'
import type {
  Student,
  Teacher,
  Course,
  Program,
  Enrollment,
  Grade,
  Certificate,
  AttendanceRecord,
  AuditLogEntry,
  EmailCampaign,
  TcuActivity,
  TcuTrainee,
  SessionException,
  Announcement,
} from '@/types'

/**
 * The data slices the scope rules read, traced across every branch. `applyScope`
 * accepts this instead of reaching the global store, so "what data can this
 * function see" is declared in the signature (ADR-0033). `StoreState`
 * structurally satisfies it, so api callers pass `state` unchanged.
 */
export interface ScopeContext {
  currentUserId: string | null
  courses: Course[]
  enrollments: Enrollment[]
  students: Student[]
  tcuTrainees: TcuTrainee[]
}

/**
 * The pivot of all Teacher scope (CONTEXT.md → Owned Courses): the set of Course
 * ids a Teacher owns, the unit by which they see rosters, Grades, Attendance,
 * Certificates, and assigned Trainees. Extracted from the six per-resource
 * functions that rebuilt it verbatim.
 */
export function ownCourseIds(courses: CourseList, userId: string): Set<string> {
  return new Set(courses.filter((c) => c.teacherId === userId).map((c) => c.id))
}

/**
 * Interpreter for scopeFor tokens.
 * Each token describes a visibility/ownership scope; this module applies those tokens
 * to filter arrays, reading any cross-slice data it needs from the passed ScopeContext.
 *
 * Token semantics:
 * - 'all' → unfiltered list
 * - 'own' → filtered by userId (e.g., grade.studentId === userId, enrollment.studentId === userId, course.teacherId === userId)
 * - 'ownCourses' → filtered by userId's owned courses (e.g., teacher's courses for grades/attendance)
 * - 'enrolledInOwnCourses' → filtered by userId's enrollments in their own courses (students in teacher's courses)
 * - 'enrolled' → filtered by userId's enrollments (students see courses they're enrolled in)
 * - 'assigned' → the single Course the userId's own trainee record is assigned to (a TCU volunteer's course)
 * - 'self' → filtered to the userId's own record (a Student's own student record; a tcu trainee/owner — traineeId === userId)
 * - 'none' → always return empty array
 *
 * The Program catalog is org-wide and read-only: every role's token is 'all'
 * (ADR-0015), handled by the generic 'all' branch below.
 */

type ProgramList = Program[]
type StudentList = Student[]
type TeacherList = Teacher[]
type CourseList = Course[]
type EnrollmentList = Enrollment[]
type GradeList = Grade[]
type CertificateList = Certificate[]
type AttendanceList = AttendanceRecord[]
type AuditLogList = AuditLogEntry[]
type EmailCampaignList = EmailCampaign[]
type TcuList = TcuActivity[]
type TraineeList = TcuTrainee[]
type SessionExceptionList = SessionException[]
type AnnouncementList = Announcement[]

/**
 * Apply a scope token to a list of items.
 * Returns the filtered list according to the token semantics and current user.
 */
export function applyScope<T extends keyof ScopeFilters>(
  resource: T,
  token: Scope,
  items: ScopeFilters[T],
  ctx: ScopeContext
): ScopeFilters[T] {
  if (token === 'none') {
    return [] as ScopeFilters[T]
  }

  if (token === 'all') {
    return items
  }

  const userId = ctx.currentUserId

  if (!userId) {
    // No user ID: only 'all' and 'none' are meaningful; default to empty
    return [] as ScopeFilters[T]
  }

  switch (resource) {
    case 'programs':
      // Viewing roles are 'all' (short-circuited above); tcu is 'none' (ADR-0035)
      // and any narrowed token yields an empty catalog.
      return applyProgramsScope(items as ProgramList, token) as ScopeFilters[T]
    case 'students':
      return applyStudentsScope(items as StudentList, token, userId, ctx) as ScopeFilters[T]
    case 'teachers':
      return applyTeachersScope(items as TeacherList, token, userId) as ScopeFilters[T]
    case 'courses':
      return applyCoursesScope(items as CourseList, token, userId, ctx) as ScopeFilters[T]
    case 'enrollments':
      return applyEnrollmentsScope(items as EnrollmentList, token, userId, ctx) as ScopeFilters[T]
    case 'grades':
      return applyGradesScope(items as GradeList, token, userId, ctx) as ScopeFilters[T]
    case 'certificates':
      return applyCertificatesScope(items as CertificateList, token, userId, ctx) as ScopeFilters[T]
    case 'attendance':
      return applyAttendanceScope(items as AttendanceList, token, userId, ctx) as ScopeFilters[T]
    case 'auditLog':
      return applyAuditLogScope(items as AuditLogList, token, userId) as ScopeFilters[T]
    case 'emailCampaigns':
      return applyEmailCampaignsScope(items as EmailCampaignList, token, userId) as ScopeFilters[T]
    case 'tcu':
      return applyTcuScope(items as TcuList, token, userId, ctx) as ScopeFilters[T]
    case 'trainees':
      return applyTraineesScope(items as TraineeList, token, userId, ctx) as ScopeFilters[T]
    case 'sessionExceptions':
      return applySessionExceptionsScope(
        items as SessionExceptionList,
        token,
        userId,
        ctx
      ) as ScopeFilters[T]
    case 'announcements':
      return applyAnnouncementsScope(
        items as AnnouncementList,
        token,
        userId,
        ctx
      ) as ScopeFilters[T]
    default:
      // Unhandled resource: default to 'none'
      return [] as ScopeFilters[T]
  }
}

export interface ScopeFilters {
  programs: ProgramList
  students: StudentList
  teachers: TeacherList
  courses: CourseList
  enrollments: EnrollmentList
  grades: GradeList
  certificates: CertificateList
  attendance: AttendanceList
  auditLog: AuditLogList
  emailCampaigns: EmailCampaignList
  tcu: TcuList
  trainees: TraineeList
  sessionExceptions: SessionExceptionList
  announcements: AnnouncementList
}

function applyProgramsScope(_programs: ProgramList, token: Scope): ProgramList {
  switch (token) {
    // 'all' never reaches here (short-circuited above); any narrowed token means
    // the catalog is not visible, so return empty.
    default:
      return []
  }
}

function applyStudentsScope(
  students: StudentList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): StudentList {
  switch (token) {
    case 'self': {
      // A Student reads only their own record (issue #166, ADR-0012). The route
      // gate (can('view','students')) stays denied, so this is the sole path a
      // Student has to the students collection — and it never reveals another.
      return students.filter((s) => s.id === userId)
    }
    case 'enrolledInOwnCourses': {
      // Students having an enrollment in a course owned by the current user
      const owned = ownCourseIds(ctx.courses, userId)
      const enrollmentsInOwnCourses = ctx.enrollments.filter((e) => owned.has(e.courseId))
      const enrolledStudentIds = new Set(enrollmentsInOwnCourses.map((e) => e.studentId))
      return students.filter((s) => enrolledStudentIds.has(s.id))
    }
    default:
      // Unexpected token for students; return empty
      return []
  }
}

function applyTeachersScope(_teachers: TeacherList, token: Scope, _userId: string): TeacherList {
  // Teachers: no non-'all' tokens currently defined
  switch (token) {
    default:
      return []
  }
}

function applyCoursesScope(
  courses: CourseList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): CourseList {
  switch (token) {
    case 'own': {
      // Courses owned by the current user
      return courses.filter((c) => c.teacherId === userId)
    }
    case 'enrolled': {
      // Courses the current user has any enrollment record in (ADR-0012). The
      // course-detail page distinguishes active (approved/pending) from
      // withdrawn/rejected for the browse-vs-records decision.
      const enrollments = ctx.enrollments.filter((e) => e.studentId === userId)
      const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId))
      return courses.filter((c) => enrolledCourseIds.has(c.id))
    }
    case 'assigned': {
      // The single Course the current user's own trainee record is assigned to
      // (ADR-0036) — the mirror of 'assignedTrainees' (a Teacher's view of their
      // volunteers) pointed the other way. The courseId is read from the trainee
      // slice, so no raw store.courses read leaks into the component (the leak
      // ADR-0033 closed in CalendarPage). A userId with no trainee record → [].
      const trainee = ctx.tcuTrainees.find((tr) => tr.id === userId)
      if (!trainee) {
        return []
      }
      return courses.filter((c) => c.id === trainee.courseId)
    }
    case 'browseable': {
      // The courses a Student may VIEW the detail of: published, at their Sede,
      // matching level, not already enrolled/pending (ADR-0016). Deliberately
      // Term-agnostic — a Term-ended cohort stays viewable (its "Term ended" badge
      // shows, only the request action drops, ADR-0042). The Browse *list* narrows
      // this to actually-open cohorts via `isOpenForEnrollment` at the api layer
      // (issue #257); the enrollment window is the list's concern, not view access.
      const student = ctx.students.find((s) => s.id === userId)
      if (!student) {
        return []
      }

      // Exclude only courses the student is ALREADY enrolled in or pending for
      // (ADR-0016). Withdrawn/rejected enrollments don't exclude — the student may
      // re-request them.
      const studentEnrollments = ctx.enrollments.filter(
        (e) => e.studentId === userId && (e.status === 'approved' || e.status === 'pending')
      )
      const enrolledOrPendingIds = new Set(studentEnrollments.map((e) => e.courseId))

      return courses.filter((c) => {
        // Must be published
        if (c.status !== 'published') return false
        // Must be at student's sede
        if (c.sede !== student.sede) return false
        // Level must match the student's level (ADR-0020)
        if (c.level !== student.educationalLevel) return false
        // Must not be already enrolled or pending
        if (enrolledOrPendingIds.has(c.id)) return false
        return true
      })
    }
    default:
      return []
  }
}

function applyEnrollmentsScope(
  enrollments: EnrollmentList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): EnrollmentList {
  switch (token) {
    case 'own': {
      // A Student reads only their own Enrollments (issue #166). Closes the
      // latent ADR-0012 violation where CoursesDetailPage read raw enrollments
      // and filtered by currentUserId in the component.
      return enrollments.filter((e) => e.studentId === userId)
    }
    case 'ownCourses': {
      // Enrollments in courses owned by the current user (a Teacher's rosters).
      const owned = ownCourseIds(ctx.courses, userId)
      return enrollments.filter((e) => owned.has(e.courseId))
    }
    default:
      return []
  }
}

function applyGradesScope(
  grades: GradeList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): GradeList {
  switch (token) {
    case 'own': {
      // Grades where the current user is the student
      return grades.filter((g) => g.studentId === userId)
    }
    case 'ownCourses': {
      // Grades in courses owned by the current user
      const owned = ownCourseIds(ctx.courses, userId)
      return grades.filter((g) => owned.has(g.courseId))
    }
    default:
      return []
  }
}

function applyCertificatesScope(
  certificates: CertificateList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): CertificateList {
  switch (token) {
    case 'own': {
      // A Student sees only their own Certificates (ADR-0012).
      return certificates.filter((c) => c.studentId === userId)
    }
    case 'ownCourses': {
      // A Teacher sees Certificates earned in the Courses they own (ADR-0019).
      const owned = ownCourseIds(ctx.courses, userId)
      return certificates.filter((c) => owned.has(c.courseId))
    }
    default:
      return []
  }
}

function applyAttendanceScope(
  records: AttendanceList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): AttendanceList {
  switch (token) {
    case 'own': {
      // Records where the current user is the student
      return records.filter((r) => r.studentId === userId)
    }
    case 'ownCourses': {
      // Records in courses owned by the current user
      const owned = ownCourseIds(ctx.courses, userId)
      return records.filter((r) => owned.has(r.courseId))
    }
    default:
      return []
  }
}

function applyAuditLogScope(_entries: AuditLogList, token: Scope, _userId: string): AuditLogList {
  // Audit log: no non-'all' tokens currently defined
  switch (token) {
    default:
      return []
  }
}

function applyEmailCampaignsScope(
  campaigns: EmailCampaignList,
  token: Scope,
  userId: string
): EmailCampaignList {
  switch (token) {
    case 'own': {
      // A Teacher's campaign history is exactly the campaigns they sent (ADR-0041).
      // 'all' (admin) is short-circuited in applyScope; every other role is 'none'.
      return campaigns.filter((c) => c.sentBy === userId)
    }
    default:
      return []
  }
}

function applyTcuScope(
  activities: TcuList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): TcuList {
  switch (token) {
    case 'self': {
      // Activities logged by the current user (tcu trainee)
      return activities.filter((a) => a.traineeId === userId)
    }
    case 'assignedTrainees': {
      // Activities for trainees assigned to courses owned by the current user (teacher).
      // Build the set of the teacher's course ids, then the set of trainee ids
      // assigned to those courses, then filter activities by traineeId.
      const teacherCourseIds = ownCourseIds(ctx.courses, userId)
      const assignedTraineeIds = new Set(
        ctx.tcuTrainees.filter((t) => teacherCourseIds.has(t.courseId)).map((t) => t.id)
      )
      return activities.filter((a) => assignedTraineeIds.has(a.traineeId))
    }
    default:
      return []
  }
}

function applySessionExceptionsScope(
  exceptions: SessionExceptionList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): SessionExceptionList {
  // Session exceptions inherit Course visibility exactly (ADR-0039): a viewer sees
  // the exceptions of precisely the Courses they can see, so the overlay never
  // leaks a deviation on a Course they can't read. Reuse the Courses scope rather
  // than re-deriving the visible set, so the two can't diverge. ('all'/'none' are
  // short-circuited in applyScope before this runs.)
  const visibleCourseIds = new Set(
    applyCoursesScope(ctx.courses, token, userId, ctx).map((c) => c.id)
  )
  return exceptions.filter((e) => visibleCourseIds.has(e.courseId))
}

function applyAnnouncementsScope(
  announcements: AnnouncementList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): AnnouncementList {
  // A feed post inherits its Course's visibility exactly (ADR-0040), the same way
  // a session exception does (ADR-0039): a viewer sees the announcements of
  // precisely the Courses they can see. Reuse the Courses scope rather than
  // re-deriving the visible set, so a post can never leak on a Course the viewer
  // can't read. ('all'/'none' are short-circuited in applyScope before this runs.)
  const visibleCourseIds = new Set(
    applyCoursesScope(ctx.courses, token, userId, ctx).map((c) => c.id)
  )
  return announcements.filter((a) => visibleCourseIds.has(a.courseId))
}

function applyTraineesScope(
  trainees: TraineeList,
  token: Scope,
  userId: string,
  ctx: ScopeContext
): TraineeList {
  switch (token) {
    case 'self': {
      // The trainee roster rides the tcu scope (no new permission): a TCU volunteer
      // sees only their own record, never other volunteers (ADR-0008, ADR-0013 pattern).
      return trainees.filter((t) => t.id === userId)
    }
    case 'assignedTrainees': {
      // A Teacher sees the volunteers assigned to the Courses they own (ADR-0011/0017),
      // mirroring the tcu-activities scope above — never a raw, unscoped store read.
      const teacherCourseIds = ownCourseIds(ctx.courses, userId)
      return trainees.filter((t) => teacherCourseIds.has(t.courseId))
    }
    default:
      return []
  }
}
