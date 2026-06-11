import type { Role, Course, TcuActivity } from '@/types/domain'

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'mark' | 'log' | 'enter'

export type Resource =
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
    students: { view: true },
    teachers: {},
    courses: { view: true },
    enrollments: {},
    grades: { view: true, enter: courseOwnedAndEnded, edit: courseOwnedAndEnded },
    certificates: {},
    attendance: { view: true, mark: courseOwned },
    tcu: {},
    reports: {},
    bulkEmail: {},
    auditLog: {},
  },
  student: {
    students: {},
    teachers: {},
    courses: { view: true },
    enrollments: {},
    grades: { view: true },
    certificates: { view: true },
    attendance: { view: true },
    tcu: { view: true },
    reports: {},
    bulkEmail: {},
    auditLog: {},
  },
  tcu: {
    students: {},
    teachers: {},
    courses: {},
    enrollments: {},
    grades: {},
    certificates: {},
    attendance: {},
    tcu: { view: true, log: activityIsOwn },
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
    students: 'enrolledInOwnCourses',
    teachers: 'none',
    courses: 'own',
    enrollments: 'none',
    grades: 'ownCourses',
    certificates: 'none',
    attendance: 'ownCourses',
    tcu: 'none',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  },
  student: {
    students: 'none',
    teachers: 'none',
    courses: 'enrolled',
    enrollments: 'none',
    grades: 'own',
    certificates: 'own',
    attendance: 'own',
    tcu: 'own',
    reports: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
  },
  tcu: {
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

  // Check if the course has ended by comparing today to the term.end date
  const now = new Date()
  const termEnd = new Date(ctx.course.term.end)

  return now >= termEnd
}

/**
 * Predicate: The activity's organizerId matches the current user's ID.
 * Used for TCU role to log only own activities.
 */
function activityIsOwn(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.activity) {
    return false
  }
  return ctx.activity.organizerId === ctx.userId
}

/**
 * Helper: Return all resources with 'none' scope.
 */
function allScopesNone(): Record<Resource, Scope> {
  return {
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
