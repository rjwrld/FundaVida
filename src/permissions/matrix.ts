import { clock } from '@/lib/clock'
import { isTermEnded } from '@/lib/closeReadiness'
import type { Role, Course, Enrollment, TcuActivity } from '@/types/domain'

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'close'
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
  | 'bulkEmail'
  | 'auditLog'
  | 'announcements'

export type Scope =
  | 'all'
  | 'own'
  | 'ownCourses'
  | 'enrolledInOwnCourses'
  | 'enrolled'
  | 'browseable'
  | 'self'
  | 'assignedTrainees'
  | 'assigned'
  | 'none'

export interface PermissionContext {
  userId?: string
  course?: Course
  enrollment?: Enrollment
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
    // Programs are a fixed, read-only catalog, org-wide in scope (ADR-0015) but
    // visible per-role (ADR-0035): no create/edit/delete cell for anyone, not even
    // admin. The tcu role does not view it (see below).
    programs: { view: true },
    students: { view: true, create: true, edit: true, delete: true },
    teachers: { view: true, create: true, edit: true, delete: true },
    courses: { view: true, create: true, edit: true, delete: true, close: true },
    enrollments: { view: true, create: true, edit: true, delete: true, approve: true },
    grades: { view: true, edit: true, enter: true, delete: true },
    // Certificates are emitted by closing a Course (ADR-0024); there is no
    // approval, so admin only views them.
    certificates: { view: true },
    attendance: { view: true, mark: true },
    tcu: { view: true, log: true, approve: true },
    bulkEmail: { view: true, create: true },
    auditLog: { view: true },
    // Admin may post to and delete from any Course's feed (ADR-0040).
    announcements: { view: true, create: true, delete: true },
  },
  teacher: {
    programs: { view: true },
    students: { view: true },
    teachers: {},
    // A Teacher may create courses (ADR-0016) but the store enforces self-assignment
    // at their own Sede. A Teacher may edit (and publish) courses they own, and
    // close their own cohort once it is over (ADR-0024).
    courses: { view: true, create: true, edit: courseOwned, close: courseOwned },
    // A Teacher may view the enrollment roster of the Courses they own (ADR-0012):
    // the Course detail page gates the roster on this, while the no-context route/nav
    // checks stay denied (the predicate needs a course).
    enrollments: { view: courseOwned, create: courseOwned, approve: courseOwned },
    grades: { view: true, enter: teacherCanGrade, edit: teacherCanGrade },
    // A Teacher views certificates earned in the Courses they own (ADR-0024).
    // `view: true` (unscoped) opens the nav/route; the data scope ('ownCourses')
    // narrows the list. There is no approval — closing the Course emits them.
    certificates: { view: true },
    attendance: { view: true, mark: courseOwned },
    // A Teacher may approve TCU activities for trainees assigned to their courses (ADR-0017)
    tcu: { approve: teacherCanApproveTcuActivity },
    // A Teacher may message the class of a Course they own (ADR-0041): both cells
    // are `courseOwned`, so the context-free nav/route check stays denied (the
    // Bulk Email nav item and /app/bulk-email route remain admin-only) while the
    // in-Course "Message the class" action opens with the Course in context. The
    // store re-checks ownership on send (ADR-0009) — this is the UI gate, not the
    // boundary. Mirrors the `enrollments` view/create shape.
    bulkEmail: { view: courseOwned, create: courseOwned },
    auditLog: {},
    // A Teacher posts to and deletes from the feed of Courses they own (ADR-0040):
    // both gate on the same `courseOwned` predicate as the session-exception write,
    // so the auto-post rides an authorization the writer already holds. `view: true`
    // opens the read for the feed section; the scope token narrows it to own Courses.
    announcements: { view: true, create: courseOwned, delete: courseOwned },
  },
  student: {
    programs: { view: true },
    students: {},
    teachers: {},
    courses: { view: true },
    // A Student may request an enrollment (self-enroll into pending) or withdraw their own
    // request (ADR-0016). `withdraw` gates on ownership in the cell (ADR-0007): only the
    // Student who owns the enrollment may withdraw it — the store passes the record as
    // context. Other operations are teacher/admin only.
    enrollments: { request: true, withdraw: studentOwnsEnrollment },
    grades: { view: true },
    certificates: { view: true },
    attendance: { view: true },
    // A Student is not a TCU Trainee, so they have no TCU access (issue #71).
    tcu: {},
    bulkEmail: {},
    auditLog: {},
    // A Student reads the feed of Courses they are enrolled in but never posts
    // (ADR-0040): no create/delete cell.
    announcements: { view: true },
  },
  tcu: {
    // A TCU Trainee is not enrolled in Courses and no tcu surface reads the
    // catalog, so the Program nav item and /app/programs route derive away for
    // this role (ADR-0035, supersedes ADR-0015's "viewable by every role").
    programs: {},
    students: {},
    teachers: {},
    courses: {},
    enrollments: {},
    grades: {},
    certificates: {},
    attendance: {},
    tcu: { view: true, log: canLogTcuActivity },
    bulkEmail: {},
    auditLog: {},
    // A TCU volunteer reads the feed of their assigned Course (surfaced on the
    // dashboard, ADR-0043) but never posts (ADR-0040). The Courses route/nav stay
    // hidden; the scope token governs the read, not the route (ADR-0036).
    announcements: { view: true },
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
    bulkEmail: 'all',
    auditLog: 'all',
    announcements: 'all',
  },
  teacher: {
    programs: 'all',
    students: 'enrolledInOwnCourses',
    teachers: 'none',
    courses: 'own',
    enrollments: 'ownCourses',
    grades: 'ownCourses',
    certificates: 'ownCourses',
    attendance: 'ownCourses',
    tcu: 'assignedTrainees',
    // A Teacher's campaign history is exactly the campaigns they sent (ADR-0041);
    // 'own' filters emailCampaigns by sentBy in the scope layer. Admin stays 'all'.
    bulkEmail: 'own',
    auditLog: 'none',
    // A Teacher's feed visibility is exactly their owned Courses (ADR-0040): the
    // token mirrors `courses: 'own'`, and applyScope routes it through the Courses
    // scope so the two can never diverge.
    announcements: 'own',
  },
  student: {
    programs: 'all',
    // A Student may read their own record ('self') and own enrollments ('own')
    // through the scope seam. There is deliberately no context-free can('view')
    // cell for either — the admin /app/students and /app/enrollments routes/nav
    // stay denied, so self-only is structural, not an accident of scope (issue
    // #166, ADR-0008/0012).
    students: 'self',
    teachers: 'none',
    courses: 'enrolled',
    enrollments: 'own',
    grades: 'own',
    certificates: 'own',
    attendance: 'own',
    tcu: 'none',
    bulkEmail: 'none',
    auditLog: 'none',
    // A Student reads the feed of the Courses they are enrolled in (ADR-0040):
    // mirrors `courses: 'enrolled'`, routed through the Courses scope.
    announcements: 'enrolled',
  },
  tcu: {
    // The read seam closes alongside the UI gate (ADR-0035): with no tcu surface
    // reading the catalog, 'none' keeps a future tcu surface from accidentally
    // listing it. applyProgramsScope already returns [] for any non-'all' token.
    programs: 'none',
    students: 'none',
    teachers: 'none',
    // A TCU volunteer serves at exactly one Course (ADR-0017): 'assigned' resolves
    // it from their own trainee record's courseId, mirroring the Teacher's
    // 'assignedTrainees' the other way. The catalog route/nav stay hidden — the
    // token governs reads, not routes (ADR-0036). Lights up the dashboard card
    // and the role's calendar (ADR-0013).
    courses: 'assigned',
    enrollments: 'none',
    grades: 'none',
    certificates: 'none',
    attendance: 'none',
    tcu: 'self',
    bulkEmail: 'none',
    auditLog: 'none',
    // The volunteer's feed is the single assigned Course's (ADR-0040): mirrors
    // `courses: 'assigned'`, routed through the Courses scope.
    announcements: 'assigned',
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
 * Predicate: a Student owns an Enrollment (studentId matches the current user).
 * The status invariant ('pending' only) is a state-machine rule enforced by the
 * store mutation, not a permission condition, so it stays out of the cell.
 */
function studentOwnsEnrollment(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.enrollment) {
    return false
  }
  return ctx.enrollment.studentId === ctx.userId
}

/**
 * Predicate: a Teacher may enter/edit Grades only on a Course they own whose Term
 * has passed AND that is still `published` (ADR-0025). Closing a cohort locks it —
 * post-close corrections flow through an admin, whose grade cells are unconditional
 * and reconcile the Certificate. Narrowed from the old "owned + ended" rule.
 */
function teacherCanGrade(ctx: PermissionContext): boolean {
  if (!ctx.userId || !ctx.course) {
    return false
  }
  if (ctx.course.teacherId !== ctx.userId) {
    return false
  }
  // A closed cohort is terminal: the Teacher can no longer touch its Grades.
  if (ctx.course.status !== 'published') {
    return false
  }

  // Route the term-end check through the one shared seam (ADR-0042): isTermEnded
  // reads term.end vs the frozen now (ADR-0014, never a live new Date()) with the
  // same exclusive `isBefore` the close worklist and "Term ended" badge use, so the
  // grade gate can never disagree with them.
  return isTermEnded(ctx.course, clock.now())
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
 * Predicate: Teacher can approve a TCU activity only if the trainee is assigned
 * to one of the Teacher's own courses (ADR-0017). The store hydrates the context
 * with that course (resolved from the trainee's courseId) before calling can().
 */
function teacherCanApproveTcuActivity(ctx: PermissionContext): boolean {
  return ctx.course?.teacherId === ctx.userId
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
    bulkEmail: 'none',
    auditLog: 'none',
    announcements: 'none',
  }
}
