import type { Scope } from '@/permissions'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  AttendanceRecord,
  AuditLogEntry,
  EmailCampaign,
  TcuActivity,
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
 * - 'self' → filtered by userId as organizer/owner (e.g., tcu activities where organizerId === userId)
 * - 'none' → always return empty array
 */

type StudentList = Student[]
type TeacherList = Teacher[]
type CourseList = Course[]
type EnrollmentList = Enrollment[]
type GradeList = Grade[]
type AttendanceList = AttendanceRecord[]
type AuditLogList = AuditLogEntry[]
type EmailCampaignList = EmailCampaign[]
type TcuList = TcuActivity[]

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
    case 'attendance':
      return applyAttendanceScope(items as AttendanceList, token, userId) as ScopeFilters[T]
    case 'auditLog':
      return applyAuditLogScope(items as AuditLogList, token, userId) as ScopeFilters[T]
    case 'emailCampaigns':
      return applyEmailCampaignsScope(items as EmailCampaignList, token, userId) as ScopeFilters[T]
    case 'tcu':
      return applyTcuScope(items as TcuList, token, userId) as ScopeFilters[T]
    default:
      // Unhandled resource: default to 'none'
      return [] as ScopeFilters[T]
  }
}

interface ScopeFilters {
  students: StudentList
  teachers: TeacherList
  courses: CourseList
  enrollments: EnrollmentList
  grades: GradeList
  attendance: AttendanceList
  auditLog: AuditLogList
  emailCampaigns: EmailCampaignList
  tcu: TcuList
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
  _enrollments: EnrollmentList,
  token: Scope,
  _userId: string
): EnrollmentList {
  // Enrollments: no non-'all' tokens currently defined
  switch (token) {
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
      // Activities organized by the current user (tcu trainee)
      return activities.filter((a) => a.organizerId === userId)
    }
    case 'own': {
      // Activities belonging to the current user (student)
      return activities.filter((a) => a.studentId === userId)
    }
    default:
      return []
  }
}
