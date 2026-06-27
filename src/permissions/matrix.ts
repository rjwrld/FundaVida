import { clock } from '@/lib/clock'
import type { Role, Course, TcuActivity } from '@/types/domain'

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'mark'
  | 'log'
  | 'enter'
  | 'request'
  | 'withdraw'

export type Resource =
  | 'programs'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'enrollments'
  | 'grades'
  | 'certificates'
  | 'attendance'
  | 'tcu'
  | 'reports'
  | 'bulkEmail'
  | 'auditLog'

export type Scope =
  | 'all'
  | 'own'
  | 'ownCourses'
  | 'enrolledInOwnCourses'
  | 'enrolled'
  | 'openForEnrollment'
  | 'self'
  | 'none'

export interface PermissionContext {
  userId?: string
  course?: Course
  activity?: TcuActivity
}

type MatrixCell = boolean | ((ctx: PermissionContext) => boolean)

/**
 * Check if a role has permission to perform an action on a resource.
 * Predicates are evaluated with context; without sufficient context, they return false.
 */
export function can(
  role: Role,
  action: Action,
  resource: Resource,
  ctx?: PermissionContext
): boolean {
  const cell = permissionMatrix[role]?.[resource]?.[action]

  if (cell === undefined) {
    return false
  }

  if (typeof cell === 'boolean') {
    return cell
  }

  // Predicate case: evaluate with context, default to false if no context
  return ctx ? cell(ctx) : false
}

/**
 * Return the scope tokens for a role across all resources.
 * Each token describes the visibility scope for that resource-role pair.
 */
export function scopeFor(role: Role): Record<Resource, Scope> {
  return scopeMatrix[role] ?? allScopesNone()
}

/**
 * The permission matrix: role × resource × action.
 * Cells are true (always allowed), false (never allowed, omitted for clarity),
 * or predicates that evaluate with context.
 */
const permissionMatrix: Record<Role, Record<Resource, Partial<Record<Action, MatrixCell>>>> = {
  admin: {
    // Programs are a fixed, read-only catalog viewable by every role (ADR-0015):
    // no create/edit/delete cell for anyone, not even admin.
    programs: { view: true },
    students: { view: true, create: true, edit: true, delete: true },
    teachers: { view: true, create: true, edit: true, delete: true },
    courses: { view: true, create: true, edit: true, delete: true },
    enrollments: { view: true, create: true, edit: true, delete: true },
    grades: { view: true, edit: true, enter: true, delete: true },
    certificates: { view: true, approve: true },
    attendance: { view: true, mark: true },
    tcu: { view: true, log: true },
    reports: { view: true },
    bulkEmail: { view: true, create: true },
    auditLog: { view: true },
  },
  teacher: {
    programs: { view: true },
    students: { view: true },
    teachers: {},
    courses: { view: true },
    // A Teacher may view the enrollment roster of the Courses they own (ADR-0012):
    // the Course detail page gates the roster on this, while the no-context route/nav
    // checks stay denied (the predicate needs a course).
    enrollments: { view: courseOwned },
    grades: { view: true, enter: courseOwnedAndEnded, edit: courseOwnedAndEnded },
    certificates: {},
    attendance: { view: true, mark: courseOwned },
    tcu: {},
    reports: {},
    bulkEmail: {},
    auditLog: {},
  },
  student: {
    programs: { view: true },
    students: {},
    teachers: {},
    courses: { view: true },
    // A Student may request an enrollment (self-enroll into pending) or withdraw their own
    // pending request (ADR-0016). Other operations are teacher/admin only.
    enrollments: { request: true, withdraw: true },
    grades: { view: true },
    certificates: { view: true },
    attendance: { view: true },
    // A Student is not a TCU Trainee, so they have no TCU access (issue #71).
    tcu: {},
    reports: {},
    bulkEmail: {},
    auditLog: {},
  },
  tcu: {
    programs: { view: true },
    students: {},
    teachers: {},
    courses: {},
    enrollments: {},
    grades: {},
    certificates: {},
    attendance: {},
    tcu: { view: true, log: canLogTcuActivity },
    reports: {},
    bulkEmail: {},
    auditLog: {},
  },
}

/**
 * Scope matrix: role × resource → scope token.
 * The token describes the visibility/ownership scope for that pair.
 */
const scopeMatrix: Record<Role, Record<Resource, Scope>> = {
  admin: {
    // The Program catalog is org-wide: every role reads it whole ('all'),
    // interpreted in the scope layer (ADR-0008/0015).
    programs: 'all',
    students: 'all',
    teachers: 'all',
    courses: 'all',
    enrollments: 'all',
    grades: 'all',
    certificates: 'all',
    attendance: 'all',
    tcu: 'all',
    reports: 'all',
    bulkEmail: 'all',
    auditLog: 'all',
  },
  teacher: {
    programs: 'all',
    students: 'enrolledInOwnCourses',
    teachers: 'none',
    courses: 'own',
    enrollments: 'ownCourses',
    grades: 'ownCourses',
    certificates: 'none',
    attendance: 'ownCourses',
    tcu: 'none',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  },
  student: {
    programs: 'all',
    students: 'none',
    teachers: 'none',
    courses: 'enrolled',
    enrollments: 'none',
    grades: 'own',
    certificates: 'own',
    attendance: 'own',
    tcu: 'none',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  },
  tcu: {
    programs: 'all',
    students: 'none',
    teachers: 'none',
    courses: 'none',
    enrollments: 'none',
    grades: 'none',
    certificates: 'none',
    attendance: 'none',
    tcu: 'self',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  },
}

/**
 * Predicate: Course is owned by the current user (teacherId matches).
 */
function courseOwned(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.course) {
    return false
  }
  return ctx.course.teacherId === ctx.userId
}

/**
 * Predicate: Course is owned by the current user AND the course has ended.
 * A course has ended if today's date is on or after the term.end date.
 */
function courseOwnedAndEnded(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.course) {
    return false
  }
  if (ctx.course.teacherId !== ctx.userId) {
    return false
  }

  // Check if the course has ended by comparing the frozen now (ADR-0014) to the
  // term.end date — never a live new Date(), so the predicate stays on the Demo
  // Epoch's timeline.
  const now = clock.now()
  const termEnd = new Date(ctx.course.term.end)

  return now >= termEnd
}

/**
 * Predicate: TCU role can log activities for their own trainee ID.
 * Activity context is required: allow only if traineeId matches userId.
 */
function canLogTcuActivity(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.activity) {
    return false
  }
  return ctx.activity.traineeId === ctx.userId
}

/**
 * Helper: Return all resources with 'none' scope.
 */
function allScopesNone(): Record<Resource, Scope> {
  return {
    programs: 'none',
    students: 'none',
    teachers: 'none',
    courses: 'none',
    enrollments: 'none',
    grades: 'none',
    certificates: 'none',
    attendance: 'none',
    tcu: 'none',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  }
}
