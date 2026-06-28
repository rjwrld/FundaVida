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
} from '@/types'
import { useStore } from '../store'

/**
 * Interpreter for scopeFor tokens.
 * Each token describes a visibility/ownership scope; this module applies those tokens
 * to filter arrays from store state.
 *
 * Token semantics:
 * - 'all' → unfiltered list
 * - 'own' → filtered by userId (e.g., grade.studentId === userId, course.teacherId === userId)
 * - 'ownCourses' → filtered by userId's owned courses (e.g., teacher's courses for grades/attendance)
 * - 'enrolledInOwnCourses' → filtered by userId's enrollments in their own courses (students in teacher's courses)
 * - 'enrolled' → filtered by userId's enrollments (students see courses they're enrolled in)
 * - 'self' → filtered by userId as trainee/owner (e.g., tcu activities where traineeId === userId)
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

/**
 * Apply a scope token to a list of items.
 * Returns the filtered list according to the token semantics and current user.
 */
export function applyScope<T extends keyof ScopeFilters>(
  resource: T,
  token: Scope,
  items: ScopeFilters[T]
): ScopeFilters[T] {
  if (token === 'none') {
    return [] as ScopeFilters[T]
  }

  if (token === 'all') {
    return items
  }

  const state = useStore.getState()
  const userId = state.currentUserId

  if (!userId) {
    // No user ID: only 'all' and 'none' are meaningful; default to empty
    return [] as ScopeFilters[T]
  }

  switch (resource) {
    case 'programs':
      // The only non-'all'/'none' path is unreachable (every role is 'all'); a
      // narrowed token defensively yields an empty catalog.
      return applyProgramsScope(items as ProgramList, token) as ScopeFilters[T]
    case 'students':
      return applyStudentsScope(items as StudentList, token, userId) as ScopeFilters[T]
    case 'teachers':
      return applyTeachersScope(items as TeacherList, token, userId) as ScopeFilters[T]
    case 'courses':
      return applyCoursesScope(items as CourseList, token, userId) as ScopeFilters[T]
    case 'enrollments':
      return applyEnrollmentsScope(items as EnrollmentList, token, userId) as ScopeFilters[T]
    case 'grades':
      return applyGradesScope(items as GradeList, token, userId) as ScopeFilters[T]
    case 'certificates':
      return applyCertificatesScope(items as CertificateList, token, userId) as ScopeFilters[T]
    case 'attendance':
      return applyAttendanceScope(items as AttendanceList, token, userId) as ScopeFilters[T]
    case 'auditLog':
      return applyAuditLogScope(items as AuditLogList, token, userId) as ScopeFilters[T]
    case 'emailCampaigns':
      return applyEmailCampaignsScope(items as EmailCampaignList, token, userId) as ScopeFilters[T]
    case 'tcu':
      return applyTcuScope(items as TcuList, token, userId) as ScopeFilters[T]
    case 'trainees':
      return applyTraineesScope(items as TraineeList, token, userId) as ScopeFilters[T]
    default:
      // Unhandled resource: default to 'none'
      return [] as ScopeFilters[T]
  }
}

interface ScopeFilters {
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
}

function applyProgramsScope(_programs: ProgramList, token: Scope): ProgramList {
  switch (token) {
    // 'all' never reaches here (short-circuited above); any narrowed token means
    // the catalog is not visible, so return empty.
    default:
      return []
  }
}

function applyStudentsScope(students: StudentList, token: Scope, userId: string): StudentList {
  switch (token) {
    case 'enrolledInOwnCourses': {
      // Students having an enrollment in a course owned by the current user
      const state = useStore.getState()
      const ownCourseIds = new Set(
        state.courses.filter((c) => c.teacherId === userId).map((c) => c.id)
      )
      const enrollmentsInOwnCourses = state.enrollments.filter((e) => ownCourseIds.has(e.courseId))
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

function applyCoursesScope(courses: CourseList, token: Scope, userId: string): CourseList {
  switch (token) {
    case 'own': {
      // Courses owned by the current user
      return courses.filter((c) => c.teacherId === userId)
    }
    case 'enrolled': {
      // Courses the current user is enrolled in
      const state = useStore.getState()
      const enrollments = state.enrollments.filter((e) => e.studentId === userId)
      const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId))
      return courses.filter((c) => enrolledCourseIds.has(c.id))
    }
    default:
      return []
  }
}

function applyEnrollmentsScope(
  enrollments: EnrollmentList,
  token: Scope,
  userId: string
): EnrollmentList {
  switch (token) {
    case 'ownCourses': {
      // Enrollments in courses owned by the current user (a Teacher's rosters).
      const state = useStore.getState()
      const ownCourseIds = new Set(
        state.courses.filter((c) => c.teacherId === userId).map((c) => c.id)
      )
      return enrollments.filter((e) => ownCourseIds.has(e.courseId))
    }
    default:
      return []
  }
}

function applyGradesScope(grades: GradeList, token: Scope, userId: string): GradeList {
  switch (token) {
    case 'own': {
      // Grades where the current user is the student
      return grades.filter((g) => g.studentId === userId)
    }
    case 'ownCourses': {
      // Grades in courses owned by the current user
      const state = useStore.getState()
      const ownCourseIds = new Set(
        state.courses.filter((c) => c.teacherId === userId).map((c) => c.id)
      )
      return grades.filter((g) => ownCourseIds.has(g.courseId))
    }
    default:
      return []
  }
}

function applyCertificatesScope(
  certificates: CertificateList,
  token: Scope,
  userId: string
): CertificateList {
  switch (token) {
    case 'own': {
      // A Student sees only their own Certificates (ADR-0012).
      return certificates.filter((c) => c.studentId === userId)
    }
    default:
      return []
  }
}

function applyAttendanceScope(
  records: AttendanceList,
  token: Scope,
  userId: string
): AttendanceList {
  switch (token) {
    case 'own': {
      // Records where the current user is the student
      return records.filter((r) => r.studentId === userId)
    }
    case 'ownCourses': {
      // Records in courses owned by the current user
      const state = useStore.getState()
      const ownCourseIds = new Set(
        state.courses.filter((c) => c.teacherId === userId).map((c) => c.id)
      )
      return records.filter((r) => ownCourseIds.has(r.courseId))
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
  _campaigns: EmailCampaignList,
  token: Scope,
  _userId: string
): EmailCampaignList {
  // Email campaigns: no non-'all' tokens currently defined
  switch (token) {
    default:
      return []
  }
}

function applyTcuScope(activities: TcuList, token: Scope, userId: string): TcuList {
  switch (token) {
    case 'self': {
      // Activities logged by the current user (tcu trainee)
      return activities.filter((a) => a.traineeId === userId)
    }
    case 'assignedTrainees': {
      // Activities for trainees assigned to courses owned by the current user (teacher).
      // Build the set of the teacher's course ids, then the set of trainee ids
      // assigned to those courses, then filter activities by traineeId.
      const state = useStore.getState()
      const teacherCourseIds = new Set(
        state.courses.filter((c) => c.teacherId === userId).map((c) => c.id)
      )
      const assignedTraineeIds = new Set(
        state.tcuTrainees.filter((t) => teacherCourseIds.has(t.courseId)).map((t) => t.id)
      )
      return activities.filter((a) => assignedTraineeIds.has(a.traineeId))
    }
    default:
      return []
  }
}

function applyTraineesScope(trainees: TraineeList, token: Scope, userId: string): TraineeList {
  switch (token) {
    case 'self': {
      // The trainee roster rides the tcu scope (no new permission): a TCU volunteer
      // sees only their own record, never other volunteers (ADR-0008, ADR-0013 pattern).
      return trainees.filter((t) => t.id === userId)
    }
    default:
      return []
  }
}
