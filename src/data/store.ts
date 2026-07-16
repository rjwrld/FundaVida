import { create } from 'zustand'
import type {
  Student,
  Teacher,
  Course,
  Program,
  Enrollment,
  Grade,
  Certificate,
  TcuActivity,
  TcuTrainee,
  AttendanceRecord,
  AuditLogEntry,
  EmailCampaign,
  EmailFilter,
  EmailAudience,
  Role,
  SessionException,
  SessionExceptionType,
  Announcement,
} from '@/types'
import { can, type Action, type Resource, type PermissionContext } from '@/permissions'
import { emitCertificatesForClose, isPassingScore } from '@/lib/certificates'
import { clock, setDemoEpoch } from '@/lib/clock'
import { sessionChangeAnnouncementBody } from '@/lib/announcements'
import { effectiveSessions, isSessionMarked, isSessionRecordable } from '@/lib/sessions'
import { recipientEmails } from '@/lib/emailRecipients'
import { fullName } from '@/lib/personName'
import { isSameDay, parseISO, startOfDay } from 'date-fns'
import { courseDisplayState, isOpenForEnrollment } from '@/lib/courseDisplayState'
import { seedDemo } from './seed'
import { debounce } from './debounce'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  loadPersistedCurrentUser,
  loadPersistedLocale,
  loadPersistedRole,
  loadPersistedState,
  savePersistedCurrentUser,
  savePersistedLocale,
  savePersistedRole,
  savePersistedState,
} from './persistence'
import type { Locale } from './persistence'

export type AuditDescriptor = Omit<AuditLogEntry, 'id' | 'timestamp' | 'actorId'>

export interface StoreState {
  // The explicit Demo Epoch and clock offset (ADR-0014). `demoEpoch` is the
  // frozen instant the clock reads as "now"; `offset` shifts it (0 today, since
  // we ship frozen). Both are persisted in the snapshot and hydrate `clock`.
  demoEpoch: string
  offset: number
  programs: Program[]
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  certificates: Certificate[]
  tcuTrainees: TcuTrainee[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
  sessionExceptions: SessionException[]
  announcements: Announcement[]
  auditLog: AuditLogEntry[]
  emailCampaigns: EmailCampaign[]
  role: Role | null
  currentUserId: string | null
  locale: Locale
  setRole: (role: Role) => void
  setLocale: (locale: Locale) => void
  resetDemo: () => void
  createStudent: (input: Omit<Student, 'id' | 'createdAt' | 'enrolledCourseIds'>) => Student
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id'>>) => void
  deleteStudent: (id: string) => void
  createCourse: (input: Omit<Course, 'id' | 'createdAt'>) => Course
  updateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  deleteCourse: (id: string) => void
  publishCourse: (courseId: string) => void
  closeCourse: (courseId: string) => void
  createTeacher: (input: Omit<Teacher, 'id' | 'createdAt' | 'courseIds'>) => Teacher
  updateTeacher: (id: string, patch: Partial<Omit<Teacher, 'id'>>) => void
  deleteTeacher: (id: string) => void
  enrollStudent: (studentId: string, courseId: string) => Enrollment
  requestEnrollment: (studentId: string, courseId: string) => Enrollment
  withdrawEnrollmentRequest: (enrollmentId: string) => void
  approveEnrollment: (enrollmentId: string) => Enrollment
  rejectEnrollment: (enrollmentId: string) => Enrollment
  unenrollStudent: (enrollmentId: string) => void
  setGrade: (studentId: string, courseId: string, score: number) => Grade
  updateGradeScore: (gradeId: string, score: number) => void
  deleteGrade: (gradeId: string) => void
  logTcuActivity: (
    input: Omit<TcuActivity, 'id' | 'status' | 'approvedBy' | 'approvedAt'>
  ) => TcuActivity
  approveTcuActivity: (activityId: string, decision: 'approved' | 'rejected') => TcuActivity
  markAttendance: (
    courseId: string,
    studentId: string,
    sessionDate: string,
    status: AttendanceRecord['status']
  ) => AttendanceRecord
  markSessionAttendance: (
    courseId: string,
    sessionDate: string,
    attendanceByStudentId: Record<string, AttendanceRecord['status']>
  ) => AttendanceRecord[]
  createSessionException: (input: {
    courseId: string
    type: SessionExceptionType
    date: string
    newDate?: string
    note?: string
  }) => SessionException
  createAnnouncement: (input: { courseId: string; body: string }) => Announcement
  deleteAnnouncement: (id: string) => void
  sendEmailCampaign: (input: {
    subject: string
    body: string
    filter: EmailFilter
    audience: EmailAudience
    recipientIds: string[]
  }) => EmailCampaign
}

export function userIdForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return 'admin'
    case 'teacher':
      return 'tea-1'
    case 'student':
      return 'stu-1'
    case 'tcu':
      return 'tcu-1'
  }
}

type PeopleGraph = Pick<StoreState, 'students' | 'teachers' | 'tcuTrainees'>

/** Does `userId` name someone who can act as `role`? Admin is a sentinel id, not a record. */
function idHoldsRole(role: Role, userId: string, graph: PeopleGraph): boolean {
  switch (role) {
    case 'admin':
      return userId === 'admin'
    case 'teacher':
      return graph.teachers.some((t) => t.id === userId)
    case 'student':
      return graph.students.some((s) => s.id === userId)
    case 'tcu':
      return graph.tcuTrainees.some((t) => t.id === userId)
  }
}

/**
 * Reconcile the session pair at hydration (#355). `role` and `currentUserId`
 * persist under two independent localStorage keys, so either can go missing on
 * its own (cleared by the browser, left behind by an older build) — and a role
 * with no identity silently narrows every self-scoped read and audits as
 * 'system'. A role whose id is absent, names nobody in the graph, or names
 * someone of another role re-derives it via {@link userIdForRole} — the same
 * binding `setRole` writes — and an id without a role is dropped, so the pair
 * can only ever boot in step.
 */
export function reconcileSession(
  role: Role | null,
  currentUserId: string | null,
  graph: PeopleGraph
): { role: Role | null; currentUserId: string | null } {
  if (role === null) {
    return { role: null, currentUserId: null }
  }
  if (currentUserId !== null && idHoldsRole(role, currentUserId, graph)) {
    return { role, currentUserId }
  }
  return { role, currentUserId: userIdForRole(role) }
}

/**
 * Check if the current role can perform an action on a resource.
 * Throws with an English error message if permission is denied.
 * Used as the first check in every store mutation, before withAudit runs.
 */
function assertCan(
  state: StoreState,
  action: Action,
  resource: Resource,
  ctx?: PermissionContext
): void {
  if (!state.role) {
    throw new Error('permission denied: no role set')
  }

  const allowed = can(state.role, action, resource, ctx)
  if (!allowed) {
    throw new Error(`permission denied: ${state.role} cannot ${action} ${resource}`)
  }
}

function makeAuditEntry(state: StoreState, entry: AuditDescriptor): AuditLogEntry {
  return {
    id: nextId('log', state.auditLog),
    // The `'system'` fallback is defensive only (ADR-0025): every set role maps to a
    // concrete `currentUserId` via `userIdForRole`, hydration reconciles the persisted
    // pair (#355), and `assertCan` throws when no role is set (ADR-0009), so no
    // in-app mutation actually attributes to 'system'.
    actorId: state.currentUserId ?? 'system',
    timestamp: clock.now().toISOString(),
    ...entry,
  }
}

export function withAudit(
  set: (fn: (state: StoreState) => Partial<StoreState>) => void,
  recipe: (state: StoreState) => { next: Partial<StoreState>; audit: AuditDescriptor }
): void {
  withAudits(set, (state) => {
    const { next, audit } = recipe(state)
    return { next, audits: [audit] }
  })
}

/**
 * The multi-entry sibling of {@link withAudit}: one mutation that legitimately
 * records more than one audit event (ADR-0040's session-change auto-post writes a
 * `session` and an `announcement` entry in the same store action). Entries are
 * stamped in order against a running log so each gets a distinct, monotonically
 * fresh id — the reason a naive two-call `makeAuditEntry` would collide. The last
 * descriptor lands on top (newest-first), matching the single-entry case.
 */
export function withAudits(
  set: (fn: (state: StoreState) => Partial<StoreState>) => void,
  recipe: (state: StoreState) => { next: Partial<StoreState>; audits: AuditDescriptor[] }
): void {
  set((state) => {
    const { next, audits } = recipe(state)
    let auditLog = state.auditLog
    for (const audit of audits) {
      auditLog = [makeAuditEntry({ ...state, auditLog }, audit), ...auditLog]
    }
    return { ...next, auditLog }
  })
}

function detectInitialLocale(): Locale {
  const persisted = loadPersistedLocale()
  if (persisted) return persisted
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
    return 'es'
  }
  return 'en'
}

function initialState(): Pick<
  StoreState,
  | 'demoEpoch'
  | 'offset'
  | 'programs'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'enrollments'
  | 'grades'
  | 'certificates'
  | 'tcuTrainees'
  | 'tcuActivities'
  | 'attendance'
  | 'sessionExceptions'
  | 'announcements'
  | 'auditLog'
  | 'emailCampaigns'
  | 'role'
  | 'currentUserId'
  | 'locale'
> {
  const locale = detectInitialLocale()
  // Boot from the persisted snapshot if it is still valid, else seed fresh at a
  // new Demo Epoch — one of the only two real-wall-time reads (ADR-0014, the
  // other is resetDemo). Either way, hydrate the clock from the snapshot's epoch
  // so business "now" is the frozen instant the seeded dates were anchored to.
  const snapshot = loadPersistedState() ?? seedDemo(new Date())
  setDemoEpoch(snapshot.demoEpoch, snapshot.offset)
  // The session pair hydrates from two independent keys, so reconcile it against
  // the snapshot's people graph (#355) — and persist the repair so the next boot
  // starts in step without re-reconciling.
  const persistedUserId = loadPersistedCurrentUser()
  const { role, currentUserId } = reconcileSession(loadPersistedRole(), persistedUserId, snapshot)
  if (currentUserId !== persistedUserId) {
    if (currentUserId === null) clearPersistedCurrentUser()
    else savePersistedCurrentUser(currentUserId)
  }
  return {
    demoEpoch: snapshot.demoEpoch,
    offset: snapshot.offset,
    programs: snapshot.programs,
    students: snapshot.students,
    teachers: snapshot.teachers,
    courses: snapshot.courses,
    enrollments: snapshot.enrollments,
    grades: snapshot.grades,
    certificates: snapshot.certificates,
    tcuTrainees: snapshot.tcuTrainees,
    tcuActivities: snapshot.tcuActivities,
    attendance: snapshot.attendance,
    sessionExceptions: snapshot.sessionExceptions,
    announcements: snapshot.announcements,
    auditLog: snapshot.auditLog,
    emailCampaigns: snapshot.emailCampaigns,
    role,
    currentUserId,
    locale,
  }
}

/** English audit copy for a session deviation (ADR-0005; audit is never t()d). */
function sessionExceptionSummary(course: Course, exception: SessionException): string {
  const day = (iso: string) => iso.slice(0, 10)
  switch (exception.type) {
    case 'cancelled':
      return `Cancelled session on ${day(exception.date)} for ${course.name}`
    case 'rescheduled':
      return `Rescheduled session from ${day(exception.date)} to ${day(exception.newDate ?? exception.date)} for ${course.name}`
    case 'extra':
      return `Added extra session on ${day(exception.date)} for ${course.name}`
  }
}

function nextId(prefix: string, existing: { id: string }[]): string {
  const nums = existing
    .map((e) => {
      const match = e.id.match(new RegExp(`^${prefix}-(\\d+)$`))
      return match?.[1] ? parseInt(match[1], 10) : 0
    })
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}-${max + 1}`
}

/**
 * Reconcile one (student, course) Certificate against the latest Grade score
 * (ADR-0025). Before the Course is closed no Certificate exists, so a Grade edit
 * leaves the list untouched. Once it is closed, a passing score (re)issues the
 * Certificate with a fresh `score` snapshot and `issuedAt` while a failing score
 * revokes it — idempotent, it rebuilds the pair's Certificate from the current
 * score rather than appending. Returns the next `certificates` array.
 */
function reconcileCertificate(
  certificates: Certificate[],
  course: Course,
  studentId: string,
  courseId: string,
  score: number
): Certificate[] {
  // Pre-close (draft/published): Grades move freely without minting or revoking
  // Certificates — emission is the close ceremony's job (ADR-0024).
  if (course.status !== 'closed') {
    return certificates
  }
  // Drop any existing Certificate for the pair so the result converges on the
  // current score rather than stacking a second one.
  const without = certificates.filter(
    (c) => !(c.studentId === studentId && c.courseId === courseId)
  )
  if (!isPassingScore(score)) {
    return without
  }
  const reissued: Certificate = {
    id: nextId('cert', certificates),
    studentId,
    courseId,
    score,
    issuedAt: clock.now().toISOString(),
  }
  return [...without, reissued]
}

export const useStore = create<StoreState>((set, get) => ({
  ...initialState(),
  setRole: (role) => {
    const userId = userIdForRole(role)
    savePersistedRole(role)
    savePersistedCurrentUser(userId)
    set({ role, currentUserId: userId })
  },
  setLocale: (locale) => {
    savePersistedLocale(locale)
    set({ locale })
  },
  resetDemo: () => {
    // Re-anchor the Demo Epoch to a fresh real instant and zero the offset
    // (ADR-0014). This is the second and last real-wall-time read; the clock is
    // re-hydrated so business "now" jumps forward to the new epoch.
    const snapshot = seedDemo(new Date())
    setDemoEpoch(snapshot.demoEpoch, snapshot.offset)
    set({
      ...snapshot,
      role: null,
      currentUserId: null,
    })
    savePersistedState(snapshot)
    clearPersistedRole()
    clearPersistedCurrentUser()
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem('fundavida:v1:banner-dismissed')
    }
  },
  createStudent: (input) => {
    const existing = get()
    assertCan(existing, 'create', 'students')
    const student: Student = {
      id: nextId('stu', existing.students),
      createdAt: clock.now().toISOString(),
      enrolledCourseIds: [],
      ...input,
    }
    withAudit(set, (state) => ({
      next: {
        students: [...state.students, student],
      },
      audit: {
        action: 'create',
        entity: 'student',
        entityId: student.id,
        summary: `Created student ${fullName(student)}`,
      },
    }))
    return student
  },
  updateStudent: (id, patch) => {
    const existing = get()
    assertCan(existing, 'edit', 'students')
    // A Student is bound to one Sede: they may only enrol in Courses at that Sede
    // (ADR-0011). Moving a Student who still has active (approved/pending)
    // enrollments would strand those pairings at the old Sede, so block the change
    // until they are unenrolled. The edit form disables the Sede field to steer
    // users here; this guards direct callers.
    const target = existing.students.find((s) => s.id === id)
    if (target && patch.sede !== undefined && patch.sede !== target.sede) {
      const activeCourseIds = new Set(
        existing.enrollments
          .filter((e) => e.studentId === id && (e.status === 'approved' || e.status === 'pending'))
          .map((e) => e.courseId)
      )
      const stranded = existing.courses.some(
        (c) => activeCourseIds.has(c.id) && c.sede !== patch.sede
      )
      if (stranded) {
        throw new Error(
          `cannot change student ${id} Sede to ${patch.sede}: still has active enrollments at ${target.sede}`
        )
      }
    }
    withAudit(set, (state) => ({
      next: {
        students: state.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
      audit: {
        action: 'update',
        entity: 'student',
        entityId: id,
        summary: `Updated student ${id}`,
      },
    }))
  },
  deleteStudent: (id) => {
    const existing = get()
    assertCan(existing, 'delete', 'students')
    withAudit(set, (state) => ({
      next: {
        students: state.students.filter((s) => s.id !== id),
        enrollments: state.enrollments.filter((e) => e.studentId !== id),
        grades: state.grades.filter((g) => g.studentId !== id),
        certificates: state.certificates.filter((c) => c.studentId !== id),
        attendance: state.attendance.filter((a) => a.studentId !== id),
      },
      audit: {
        action: 'delete',
        entity: 'student',
        entityId: id,
        summary: `Deleted student ${id}`,
      },
    }))
  },
  createCourse: (input) => {
    const existing = get()
    assertCan(existing, 'create', 'courses')
    // Teachers must self-assign (ADR-0016): enforce that the teacherId matches
    // the current user if the role is 'teacher'.
    if (existing.role === 'teacher' && input.teacherId !== existing.currentUserId) {
      throw new Error(
        `permission denied: teacher cannot create a course assigned to another teacher`
      )
    }
    // A Course is taught at its Teacher's Sede (ADR-0011). The Course form filters
    // the Teacher picker to the chosen Sede, so this guards direct callers.
    const courseTeacher = existing.teachers.find((t) => t.id === input.teacherId)
    if (!courseTeacher || courseTeacher.sede !== input.sede) {
      throw new Error(
        `cannot create course at ${input.sede} with teacher ${input.teacherId} (${courseTeacher?.sede ?? 'unknown'}): Sede mismatch`
      )
    }
    const course: Course = {
      id: nextId('cou', existing.courses),
      createdAt: clock.now().toISOString(),
      ...input,
    }
    withAudit(set, (state) => {
      const updatedTeachers = state.teachers.map((t) =>
        t.id === course.teacherId ? { ...t, courseIds: [...t.courseIds, course.id] } : t
      )
      return {
        next: {
          courses: [...state.courses, course],
          teachers: updatedTeachers,
        },
        audit: {
          action: 'create',
          entity: 'course',
          entityId: course.id,
          summary: `Created course ${course.name}`,
        },
      }
    })
    return course
  },
  updateCourse: (id, patch) => {
    const existing = get()
    assertCan(existing, 'edit', 'courses')
    // Preserve the Course↔Teacher Sede invariant across edits: whichever of sede
    // or teacherId the patch changes, the effective pair must still match (ADR-0011).
    const target = existing.courses.find((c) => c.id === id)
    if (target) {
      const nextSede = patch.sede ?? target.sede
      const nextTeacherId = patch.teacherId ?? target.teacherId
      const nextTeacher = existing.teachers.find((t) => t.id === nextTeacherId)
      if (!nextTeacher || nextTeacher.sede !== nextSede) {
        throw new Error(
          `cannot update course ${id}: teacher ${nextTeacherId} (${nextTeacher?.sede ?? 'unknown'}) is not at Sede ${nextSede}`
        )
      }
    }
    withAudit(set, (state) => {
      const current = state.courses.find((c) => c.id === id)
      const teacherChanged =
        current !== undefined &&
        patch.teacherId !== undefined &&
        patch.teacherId !== current.teacherId
      const updatedCourses = state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c))
      const newTeacherId = patch.teacherId
      if (!teacherChanged || !current || !newTeacherId) {
        return {
          next: { courses: updatedCourses },
          audit: {
            action: 'update',
            entity: 'course',
            entityId: id,
            summary: `Updated course ${id}`,
          },
        }
      }
      const oldTeacherId = current.teacherId
      const updatedTeachers = state.teachers.map((t) => {
        if (t.id === oldTeacherId) {
          return { ...t, courseIds: t.courseIds.filter((cid) => cid !== id) }
        }
        if (t.id === newTeacherId && !t.courseIds.includes(id)) {
          return { ...t, courseIds: [...t.courseIds, id] }
        }
        return t
      })
      return {
        next: {
          courses: updatedCourses,
          teachers: updatedTeachers,
        },
        audit: {
          action: 'update',
          entity: 'course',
          entityId: id,
          summary: `Updated course ${id}`,
        },
      }
    })
  },
  deleteCourse: (id) => {
    const existing = get()
    assertCan(existing, 'delete', 'courses')
    withAudit(set, (state) => ({
      next: {
        courses: state.courses.filter((c) => c.id !== id),
        enrollments: state.enrollments.filter((e) => e.courseId !== id),
        grades: state.grades.filter((g) => g.courseId !== id),
        certificates: state.certificates.filter((c) => c.courseId !== id),
        attendance: state.attendance.filter((a) => a.courseId !== id),
        teachers: state.teachers.map((t) => ({
          ...t,
          courseIds: t.courseIds.filter((cid) => cid !== id),
        })),
        students: state.students.map((s) => ({
          ...s,
          enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== id),
        })),
      },
      audit: {
        action: 'delete',
        entity: 'course',
        entityId: id,
        summary: `Deleted course ${id}`,
      },
    }))
  },
  publishCourse: (courseId) => {
    const existing = get()
    const course = existing.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`course ${courseId} not found`)
    }
    // Only the course's teacher (courseOwned) or admin can publish (ADR-0016).
    assertCan(existing, 'edit', 'courses', { course, userId: existing.currentUserId ?? undefined })
    withAudit(set, (state) => ({
      next: {
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, status: 'published' as const } : c
        ),
      },
      audit: {
        action: 'update',
        entity: 'course',
        entityId: courseId,
        summary: `Published course ${course.name}`,
      },
    }))
  },
  closeCourse: (courseId) => {
    const existing = get()
    const course = existing.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`course ${courseId} not found`)
    }
    // Only the course's teacher (courseOwned) or admin may close a cohort (ADR-0024).
    assertCan(existing, 'close', 'courses', {
      course,
      userId: existing.currentUserId ?? undefined,
    })
    // Closing is a deliberate ceremony on a live cohort: a draft is not yet open
    // and a closed Course is terminal, so both reject (ADR-0024).
    if (course.status !== 'published') {
      throw new Error(
        `cannot close course ${courseId}: status is ${course.status}, expected published`
      )
    }
    // Closing emits a downloadable Certificate for every enrolled Student with a
    // passing Grade, all at once and in the same mutation as the status flip
    // (ADR-0024). The pure seed carries (student, course, score); the store stamps
    // each with a fresh id and the close instant as `issuedAt`.
    const issuedAt = clock.now().toISOString()
    withAudit(set, (state) => {
      const seeds = emitCertificatesForClose(course, state.enrollments, state.grades)
      const emitted: Certificate[] = []
      seeds.forEach((seed) => {
        emitted.push({ id: nextId('cert', [...state.certificates, ...emitted]), ...seed, issuedAt })
      })
      return {
        next: {
          courses: state.courses.map((c) =>
            c.id === courseId ? { ...c, status: 'closed' as const } : c
          ),
          certificates: [...state.certificates, ...emitted],
        },
        audit: {
          action: 'close',
          entity: 'course',
          entityId: courseId,
          summary: `Closed course ${course.name}, emitted ${emitted.length} certificate(s)`,
        },
      }
    })
  },
  createTeacher: (input) => {
    const existing = get()
    assertCan(existing, 'create', 'teachers')
    const teacher: Teacher = {
      id: nextId('tea', existing.teachers),
      createdAt: clock.now().toISOString(),
      courseIds: [],
      ...input,
    }
    withAudit(set, (state) => ({
      next: {
        teachers: [...state.teachers, teacher],
      },
      audit: {
        action: 'create',
        entity: 'teacher',
        entityId: teacher.id,
        summary: `Created teacher ${fullName(teacher)}`,
      },
    }))
    return teacher
  },
  updateTeacher: (id, patch) => {
    const existing = get()
    assertCan(existing, 'edit', 'teachers')
    // A Course is taught at its Teacher's Sede (ADR-0011). Moving a Teacher who
    // still owns Courses would break `course.sede === teacher.sede` for every one
    // of them, so block the change until those Courses are reassigned. The edit
    // form disables the Sede field to steer users here; this guards direct callers.
    const target = existing.teachers.find((t) => t.id === id)
    if (target && patch.sede !== undefined && patch.sede !== target.sede) {
      const stranded = existing.courses.some((c) => c.teacherId === id && c.sede !== patch.sede)
      if (stranded) {
        throw new Error(
          `cannot change teacher ${id} Sede to ${patch.sede}: still owns courses at ${target.sede}`
        )
      }
    }
    withAudit(set, (state) => ({
      next: {
        teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      },
      audit: {
        action: 'update',
        entity: 'teacher',
        entityId: id,
        summary: `Updated teacher ${id}`,
      },
    }))
  },
  deleteTeacher: (id) => {
    const existing = get()
    assertCan(existing, 'delete', 'teachers')
    const { teachers } = existing
    const target = teachers.find((t) => t.id === id)
    if (!target) return
    if (target.courseIds.length > 0) {
      // Defensive guard for direct store callers; the UI pre-checks and surfaces a localized message,
      // so this English text should never reach end users. Keep "reassign" to satisfy existing tests.
      throw new Error('teacher has courses assigned — reassign before deleting')
    }
    withAudit(set, (state) => ({
      next: {
        teachers: state.teachers.filter((t) => t.id !== id),
      },
      audit: {
        action: 'delete',
        entity: 'teacher',
        entityId: id,
        summary: `Deleted teacher ${id}`,
      },
    }))
  },
  enrollStudent: (studentId, courseId) => {
    const state = get()
    const { enrollments, students, courses } = state
    const existing = enrollments.find((e) => e.studentId === studentId && e.courseId === courseId)
    if (existing) return existing
    // Defensive guards for direct store callers; the UI only enrolls from existing
    // records, so this English text should never reach end users.
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      throw new Error(`cannot enroll unknown student ${studentId}`)
    }
    const course = courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`cannot enroll in unknown course ${courseId}`)
    }
    // Check permission with course context (teacher may only enroll into their own courses)
    assertCan(state, 'create', 'enrollments', {
      userId: state.currentUserId ?? undefined,
      course,
    })
    // A Student may only enrol in Courses at their own Sede (ADR-0011). The Enroll
    // dialog filters to same-Sede students, so this guards direct callers and
    // should never reach end users.
    if (student.sede !== course.sede) {
      throw new Error(
        `cannot enroll student ${studentId} (${student.sede}) in course ${courseId} (${course.sede}): Sede mismatch`
      )
    }
    // A Student may only enroll in Courses matching their educational level (ADR-0020).
    if (course.level !== student.educationalLevel) {
      throw new Error(
        `cannot enroll student ${studentId} (${student.educationalLevel}) in course ${courseId} (${course.level}): Level mismatch`
      )
    }
    // A Course accepts enrollments only while Starts soon / In progress (ADR-0042):
    // a Term-ended (or draft/closed) Course is rejected, same term-end seal as the
    // close worklist. Mid-Term joins stay allowed. The Browse UI hides the request
    // button as defense-in-depth.
    const enrollNow = clock.now()
    if (!isOpenForEnrollment(course, enrollNow)) {
      throw new Error(
        `cannot enroll student ${studentId} in course ${courseId}: not open for enrollment (${courseDisplayState(course, enrollNow)})`
      )
    }
    // Capacity is a hard invariant (ADR-0016): a direct-enroll lands straight in
    // 'approved', so it must honour the same seat cap as approveEnrollment.
    const approvedCount = state.enrollments.filter(
      (e) => e.courseId === courseId && e.status === 'approved'
    ).length
    if (approvedCount >= course.capacity) {
      throw new Error(
        `cannot enroll student ${studentId}: course ${courseId} has reached capacity (${course.capacity})`
      )
    }
    // A Teacher/admin direct-enroll lands straight in 'approved' (ADR-0016); the
    // current user is the deciding actor. Student self-enroll into 'pending'
    // arrives with that workflow in a later slice.
    const now = clock.now().toISOString()
    const enrollment: Enrollment = {
      id: nextId('enr', enrollments),
      studentId,
      courseId,
      enrolledAt: now,
      status: 'approved',
      requestedAt: now,
      decidedBy: state.currentUserId ?? 'system',
      decidedAt: now,
    }
    withAudit(set, (state) => {
      const updatedStudents = state.students.map((s) =>
        s.id === studentId && !s.enrolledCourseIds.includes(courseId)
          ? { ...s, enrolledCourseIds: [...s.enrolledCourseIds, courseId] }
          : s
      )
      return {
        next: {
          enrollments: [...state.enrollments, enrollment],
          students: updatedStudents,
        },
        audit: {
          action: 'enroll',
          entity: 'enrollment',
          entityId: enrollment.id,
          summary: `Enrolled ${studentId} in ${courseId}`,
        },
      }
    })
    return enrollment
  },
  requestEnrollment: (studentId, courseId) => {
    const state = get()
    assertCan(state, 'request', 'enrollments')
    const { enrollments, students, courses } = state
    const existing = enrollments.find((e) => e.studentId === studentId && e.courseId === courseId)
    // An active request (approved or pending) short-circuits — re-requesting is a
    // no-op. A rejected/withdrawn record does NOT: the browseable scope lets
    // such courses reappear in Browse, so re-pend the same record below rather than
    // returning the stale decision (which silently no-ops the request).
    if (existing && (existing.status === 'approved' || existing.status === 'pending')) {
      return existing
    }
    // Defensive guards for direct store callers; the UI filters to browseable courses, so this English text should never reach end users.
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      throw new Error(`cannot request enrollment for unknown student ${studentId}`)
    }
    const course = courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`cannot request enrollment in unknown course ${courseId}`)
    }
    // A Student may only request courses at their own Sede (ADR-0011, ADR-0016).
    if (student.sede !== course.sede) {
      throw new Error(
        `cannot request enrollment for student ${studentId} (${student.sede}) in course ${courseId} (${course.sede}): Sede mismatch`
      )
    }
    // A Student may only request courses matching their educational level (ADR-0020).
    if (course.level !== student.educationalLevel) {
      throw new Error(
        `cannot request enrollment for student ${studentId} (${student.educationalLevel}) in course ${courseId} (${course.level}): Level mismatch`
      )
    }
    // Requests are accepted only while the Course is Starts soon / In progress
    // (ADR-0042) and rejected once the Term has ended (or for draft/closed) — the
    // same term-end seal as the close worklist. Mid-Term joins stay allowed.
    const requestNow = clock.now()
    if (!isOpenForEnrollment(course, requestNow)) {
      throw new Error(
        `cannot request enrollment for student ${studentId} in course ${courseId}: not open for enrollment (${courseDisplayState(course, requestNow)})`
      )
    }
    const now = clock.now().toISOString()
    // Re-request after a rejection/withdrawal: flip the SAME record back to
    // pending (clearing the prior decision) instead of creating a second one. The
    // browse detail and approval queue both key off the single (student, course)
    // enrollment, so a duplicate would let the stale record win their lookups.
    if (existing) {
      const repended: Enrollment = {
        ...existing,
        status: 'pending',
        requestedAt: now,
        decidedBy: undefined,
        decidedAt: undefined,
      }
      withAudit(set, (state) => ({
        next: {
          enrollments: state.enrollments.map((e) => (e.id === existing.id ? repended : e)),
        },
        audit: {
          action: 'requestEnroll',
          entity: 'enrollment',
          entityId: existing.id,
          summary: `${studentId} re-requested enrollment in ${courseId}`,
        },
      }))
      return repended
    }
    const enrollment: Enrollment = {
      id: nextId('enr', enrollments),
      studentId,
      courseId,
      enrolledAt: now,
      status: 'pending',
      requestedAt: now,
    }
    withAudit(set, (state) => {
      return {
        next: {
          enrollments: [...state.enrollments, enrollment],
        },
        audit: {
          action: 'requestEnroll',
          entity: 'enrollment',
          entityId: enrollment.id,
          summary: `${studentId} requested enrollment in ${courseId}`,
        },
      }
    })
    return enrollment
  },
  withdrawEnrollmentRequest: (enrollmentId) => {
    const state = get()
    const { enrollments } = state
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) return
    // The store is the real boundary, not the UI's isPending gate (ADR-0009). Ownership
    // lives in the matrix cell (ADR-0007): only the Student who owns this record may
    // withdraw it — pass the enrollment as context. `status === 'pending'` is a
    // state-machine invariant, not a permission condition, so it throws here: an
    // approved enrollment is removed via unenrollStudent, never withdrawn.
    assertCan(state, 'withdraw', 'enrollments', {
      userId: state.currentUserId ?? undefined,
      enrollment: target,
    })
    if (target.status !== 'pending') {
      throw new Error(
        `cannot withdraw enrollment ${enrollmentId}: status is ${target.status}, not pending`
      )
    }
    withAudit(set, (state) => {
      // Defense-in-depth: setGrade / markAttendance gate on Course ownership, not on
      // enrollment status, so a pending record can accrue derived rows. Reconcile the
      // same slices unenrollStudent does (by studentId + courseId) so a withdrawal never
      // strands grades / certificates / attendance. The enrollment record itself is kept
      // (flipped to withdrawn, not deleted) so a re-request can re-pend it.
      const updatedStudents = state.students.map((s) =>
        s.id === target.studentId
          ? {
              ...s,
              enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== target.courseId),
            }
          : s
      )
      return {
        next: {
          enrollments: state.enrollments.map((e) =>
            e.id === enrollmentId ? { ...e, status: 'withdrawn' as const } : e
          ),
          grades: state.grades.filter(
            (g) => !(g.studentId === target.studentId && g.courseId === target.courseId)
          ),
          certificates: state.certificates.filter(
            (c) => !(c.studentId === target.studentId && c.courseId === target.courseId)
          ),
          attendance: state.attendance.filter(
            (a) => !(a.studentId === target.studentId && a.courseId === target.courseId)
          ),
          students: updatedStudents,
        },
        audit: {
          action: 'withdraw',
          entity: 'enrollment',
          entityId: enrollmentId,
          summary: `Withdrew enrollment request ${enrollmentId}`,
        },
      }
    })
  },
  approveEnrollment: (enrollmentId) => {
    const state = get()
    const { enrollments, courses } = state
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) {
      throw new Error(`cannot approve unknown enrollment ${enrollmentId}`)
    }
    const course = courses.find((c) => c.id === target.courseId)
    if (!course) {
      throw new Error(`cannot approve enrollment: unknown course ${target.courseId}`)
    }
    // Check permission: only course owner (teacher) or admin can approve
    assertCan(state, 'approve', 'enrollments', {
      userId: state.currentUserId ?? undefined,
      course,
    })
    // Check capacity: count already-approved enrollments
    const approvedCount = state.enrollments.filter(
      (e) => e.courseId === target.courseId && e.status === 'approved'
    ).length
    if (approvedCount >= course.capacity) {
      throw new Error(
        `cannot approve enrollment: course ${target.courseId} has reached capacity (${course.capacity})`
      )
    }
    const now = clock.now().toISOString()
    const approved: Enrollment = {
      ...target,
      status: 'approved',
      decidedBy: state.currentUserId ?? 'system',
      decidedAt: now,
    }
    withAudit(set, (state) => {
      const updatedStudents = state.students.map((s) =>
        s.id === target.studentId && !s.enrolledCourseIds.includes(target.courseId)
          ? { ...s, enrolledCourseIds: [...s.enrolledCourseIds, target.courseId] }
          : s
      )
      return {
        next: {
          enrollments: state.enrollments.map((e) => (e.id === enrollmentId ? approved : e)),
          students: updatedStudents,
        },
        audit: {
          action: 'approve',
          entity: 'enrollment',
          entityId: enrollmentId,
          summary: `Approved enrollment ${enrollmentId}`,
        },
      }
    })
    return approved
  },
  rejectEnrollment: (enrollmentId) => {
    const state = get()
    const { enrollments, courses } = state
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) {
      throw new Error(`cannot reject unknown enrollment ${enrollmentId}`)
    }
    const course = courses.find((c) => c.id === target.courseId)
    if (!course) {
      throw new Error(`cannot reject enrollment: unknown course ${target.courseId}`)
    }
    // Check permission: only course owner (teacher) or admin can reject
    assertCan(state, 'approve', 'enrollments', {
      userId: state.currentUserId ?? undefined,
      course,
    })
    const now = clock.now().toISOString()
    const rejected: Enrollment = {
      ...target,
      status: 'rejected',
      decidedBy: state.currentUserId ?? 'system',
      decidedAt: now,
    }
    withAudit(set, (state) => {
      return {
        next: {
          enrollments: state.enrollments.map((e) => (e.id === enrollmentId ? rejected : e)),
        },
        audit: {
          action: 'approve',
          entity: 'enrollment',
          entityId: enrollmentId,
          summary: `Rejected enrollment ${enrollmentId}`,
        },
      }
    })
    return rejected
  },
  unenrollStudent: (enrollmentId) => {
    const state = get()
    assertCan(state, 'delete', 'enrollments')
    const { enrollments } = state
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) return
    withAudit(set, (state) => {
      const updatedStudents = state.students.map((s) =>
        s.id === target.studentId
          ? {
              ...s,
              enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== target.courseId),
            }
          : s
      )
      return {
        next: {
          enrollments: state.enrollments.filter((e) => e.id !== enrollmentId),
          grades: state.grades.filter(
            (g) => !(g.studentId === target.studentId && g.courseId === target.courseId)
          ),
          certificates: state.certificates.filter(
            (c) => !(c.studentId === target.studentId && c.courseId === target.courseId)
          ),
          attendance: state.attendance.filter(
            (a) => !(a.studentId === target.studentId && a.courseId === target.courseId)
          ),
          students: updatedStudents,
        },
        audit: {
          action: 'unenroll',
          entity: 'enrollment',
          entityId: enrollmentId,
          summary: `Unenrolled ${target.studentId} from ${target.courseId}`,
        },
      }
    })
  },
  setGrade: (studentId, courseId, score) => {
    const state = get()
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`cannot set grade: unknown course ${courseId}`)
    }
    // Check if this is a new grade (create action) or updating (edit action)
    const { grades } = state
    const existing = grades.find((g) => g.studentId === studentId && g.courseId === courseId)
    const action = existing ? 'edit' : 'enter'
    assertCan(state, action, 'grades', { userId: state.currentUserId ?? undefined, course })
    if (existing) {
      const updated: Grade = { ...existing, score, issuedAt: clock.now().toISOString() }
      withAudit(set, (state) => ({
        next: {
          grades: state.grades.map((g) => (g.id === existing.id ? updated : g)),
          // Post-close, an edited Grade reconciles its Certificate (ADR-0025);
          // pre-close this is a no-op.
          certificates: reconcileCertificate(
            state.certificates,
            course,
            studentId,
            courseId,
            score
          ),
        },
        audit: {
          action: 'grade',
          entity: 'grade',
          entityId: existing.id,
          summary: `Updated grade for ${studentId} in ${courseId} to ${score}`,
        },
      }))
      return updated
    }
    const grade: Grade = {
      id: nextId('gra', grades),
      studentId,
      courseId,
      score,
      issuedAt: clock.now().toISOString(),
    }
    withAudit(set, (state) => ({
      next: {
        grades: [...state.grades, grade],
        // A new Grade on an already-closed Course reconciles too (ADR-0025);
        // pre-close this is a no-op.
        certificates: reconcileCertificate(state.certificates, course, studentId, courseId, score),
      },
      audit: {
        action: 'grade',
        entity: 'grade',
        entityId: grade.id,
        summary: `Graded ${studentId} in ${courseId} with ${score}`,
      },
    }))
    return grade
  },
  updateGradeScore: (gradeId, score) => {
    const state = get()
    const grade = state.grades.find((g) => g.id === gradeId)
    if (!grade) {
      throw new Error(`cannot update grade: unknown grade ${gradeId}`)
    }
    const course = state.courses.find((c) => c.id === grade.courseId)
    if (!course) {
      throw new Error(`cannot update grade: unknown course ${grade.courseId}`)
    }
    assertCan(state, 'edit', 'grades', { userId: state.currentUserId ?? undefined, course })
    withAudit(set, (state) => ({
      next: {
        grades: state.grades.map((g) =>
          g.id === gradeId ? { ...g, score, issuedAt: clock.now().toISOString() } : g
        ),
        // A post-close score correction reconciles the Certificate (ADR-0025):
        // below 70 revokes it, at/above 70 (re)issues with the new snapshot.
        certificates: reconcileCertificate(
          state.certificates,
          course,
          grade.studentId,
          course.id,
          score
        ),
      },
      audit: {
        action: 'update',
        entity: 'grade',
        entityId: gradeId,
        summary: `Updated grade ${gradeId} to ${score}`,
      },
    }))
  },
  deleteGrade: (gradeId) => {
    const state = get()
    const grade = state.grades.find((g) => g.id === gradeId)
    if (!grade) {
      throw new Error(`cannot delete grade: unknown grade ${gradeId}`)
    }
    const course = state.courses.find((c) => c.id === grade.courseId)
    if (!course) {
      throw new Error(`cannot delete grade: unknown course ${grade.courseId}`)
    }
    assertCan(state, 'delete', 'grades', { userId: state.currentUserId ?? undefined, course })
    withAudit(set, (state) => ({
      next: {
        grades: state.grades.filter((g) => g.id !== gradeId),
      },
      audit: {
        action: 'delete',
        entity: 'grade',
        entityId: gradeId,
        summary: `Deleted grade ${gradeId}`,
      },
    }))
  },
  logTcuActivity: (input) => {
    const existing = get()
    // A logged activity is 'pending' until the assigned Course's Teacher
    // approves it (ADR-0017) — the approval workflow lands in a later slice.
    const tempActivity: TcuActivity = {
      id: 'temp',
      status: 'pending',
      ...input,
    }
    assertCan(existing, 'log', 'tcu', {
      userId: existing.currentUserId ?? undefined,
      activity: tempActivity,
    })
    const activity: TcuActivity = {
      id: nextId('tcu-act', existing.tcuActivities),
      status: 'pending',
      ...input,
    }
    withAudit(set, (state) => ({
      next: {
        tcuActivities: [...state.tcuActivities, activity],
      },
      audit: {
        action: 'log',
        entity: 'tcuActivity',
        entityId: activity.id,
        summary: `Logged TCU activity "${activity.title}" (${activity.hours} hours)`,
      },
    }))
    return activity
  },
  approveTcuActivity: (activityId, decision) => {
    const state = get()
    const activity = state.tcuActivities.find((a) => a.id === activityId)
    if (!activity) {
      throw new Error(`cannot approve: unknown activity ${activityId}`)
    }

    // Find the trainee and their assigned course
    const trainee = state.tcuTrainees.find((t) => t.id === activity.traineeId)
    if (!trainee) {
      throw new Error(`cannot approve: unknown trainee ${activity.traineeId}`)
    }

    // Find the course the trainee is assigned to
    const course = state.courses.find((c) => c.id === trainee.courseId)
    if (!course) {
      throw new Error(`cannot approve: unknown course ${trainee.courseId}`)
    }

    // Permission flows through the matrix seam (ADR-0009): admin's tcu.approve is
    // unconditional; the teacher predicate (teacherCanApproveTcuActivity) allows it
    // only when they own the trainee's course. assertCan throws on a violation.
    assertCan(state, 'approve', 'tcu', {
      userId: state.currentUserId ?? undefined,
      course,
      activity,
    })

    // Approving or rejecting already-decided activities is a no-op
    if (activity.status !== 'pending') {
      return activity
    }

    const approvedBy = state.currentUserId ?? 'system'
    const approvedAt = clock.now().toISOString()
    const updated: TcuActivity = {
      ...activity,
      status: decision === 'approved' ? 'approved' : 'rejected',
      approvedBy,
      approvedAt,
    }

    withAudit(set, (state) => ({
      next: {
        tcuActivities: state.tcuActivities.map((a) => (a.id === activityId ? updated : a)),
      },
      audit: {
        action: 'approve',
        entity: 'tcuActivity',
        entityId: activityId,
        summary: `${decision === 'approved' ? 'Approved' : 'Rejected'} TCU activity ${activityId} for ${fullName(trainee)}`,
      },
    }))
    return updated
  },
  markAttendance: (courseId, studentId, sessionDate, status) => {
    const state = get()
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`cannot mark attendance: unknown course ${courseId}`)
    }
    assertCan(state, 'mark', 'attendance', { userId: state.currentUserId ?? undefined, course })
    // Find existing record by (courseId, studentId, sessionDate) or create new one
    const existing = state.attendance.find(
      (a) => a.courseId === courseId && a.studentId === studentId && a.sessionDate === sessionDate
    )
    if (existing) {
      const updated: AttendanceRecord = { ...existing, status }
      withAudit(set, (state) => ({
        next: {
          attendance: state.attendance.map((a) => (a.id === existing.id ? updated : a)),
        },
        audit: {
          action: 'update',
          entity: 'attendance',
          entityId: existing.id,
          summary: `Marked attendance for student ${studentId} on ${sessionDate} as ${status}`,
        },
      }))
      return updated
    } else {
      const newRecord: AttendanceRecord = {
        id: nextId('att', state.attendance),
        courseId,
        studentId,
        sessionDate,
        status,
      }
      withAudit(set, (state) => ({
        next: {
          attendance: [newRecord, ...state.attendance],
        },
        audit: {
          action: 'create',
          entity: 'attendance',
          entityId: newRecord.id,
          summary: `Created attendance for student ${studentId} on ${sessionDate} as ${status}`,
        },
      }))
      return newRecord
    }
  },
  markSessionAttendance: (courseId, sessionDate, attendanceByStudentId) => {
    const state = get()
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error(`cannot mark session attendance: unknown course ${courseId}`)
    }
    // Check permission: teacher of the course or admin, and session must be markable
    // (on or before today). The route guard will also check markability, but we verify
    // here to prevent permission bypass.
    assertCan(state, 'mark', 'attendance', { userId: state.currentUserId ?? undefined, course })

    // Bulk update/create attendance records. For each studentId, find existing record
    // or create new one, then apply the new status.
    const records: AttendanceRecord[] = []

    withAudit(set, (state) => {
      const updatedAttendance = [...state.attendance]
      const createdRecords: AttendanceRecord[] = []

      for (const [studentId, status] of Object.entries(attendanceByStudentId)) {
        const existing = updatedAttendance.find(
          (a) =>
            a.courseId === courseId && a.studentId === studentId && a.sessionDate === sessionDate
        )

        if (existing) {
          const updated: AttendanceRecord = { ...existing, status }
          const index = updatedAttendance.indexOf(existing)
          updatedAttendance[index] = updated
          records.push(updated)
        } else {
          const newRecord: AttendanceRecord = {
            id: nextId('att', updatedAttendance),
            courseId,
            studentId,
            sessionDate,
            status,
          }
          updatedAttendance.unshift(newRecord)
          records.push(newRecord)
          createdRecords.push(newRecord)
        }
      }

      const summary =
        createdRecords.length > 0
          ? `Marked ${Object.keys(attendanceByStudentId).length} students for session on ${sessionDate} (${createdRecords.length} new, ${Object.keys(attendanceByStudentId).length - createdRecords.length} updated)`
          : `Marked ${Object.keys(attendanceByStudentId).length} students for session on ${sessionDate}`

      return {
        next: {
          attendance: updatedAttendance,
        },
        audit: {
          action: 'update',
          entity: 'attendance',
          entityId: `${courseId}-${sessionDate}`,
          summary,
        },
      }
    })

    return records
  },
  createSessionException: (input) => {
    const state = get()
    const course = state.courses.find((c) => c.id === input.courseId)
    if (!course) {
      throw new Error(`cannot create session exception: unknown course ${input.courseId}`)
    }
    // Writers are the Course's own Teacher (courseOwned predicate) or admin, via
    // the existing `courses` edit permission plus ownership — no new matrix
    // resource (ADR-0039, ADR-0009). assertCan throws on a violation before any
    // integrity check runs.
    assertCan(state, 'edit', 'courses', { course, userId: state.currentUserId ?? undefined })
    // A closed cohort is terminal (ADR-0024): its schedule is frozen. The UI hides
    // the controls, but the store is the real boundary (ADR-0009), so guard here too.
    if (course.status === 'closed') {
      throw new Error(`cannot modify sessions of course ${input.courseId}: it is closed`)
    }

    const today = clock.today()
    // The overlay composes on top of whatever exceptions already exist, so
    // collision/target checks see the *current* effective schedule (ADR-0039).
    const current = effectiveSessions(course, state.sessionExceptions)
    const onOrAfterToday = (date: string) => startOfDay(parseISO(date)) >= today

    if (input.type === 'cancelled' || input.type === 'rescheduled') {
      // The target must name a Session that currently exists and has not yet
      // occurred; a Session with any recorded attendance is immutable (ADR-0039).
      const target = current.find((s) => isSameDay(parseISO(s.date), parseISO(input.date)))
      if (!target) {
        throw new Error(`cannot modify session on ${input.date}: no such session for this course`)
      }
      if (isSessionRecordable(target, today)) {
        throw new Error(`cannot modify session on ${input.date}: it has already occurred (past)`)
      }
      if (isSessionMarked(course.id, input.date, state.attendance)) {
        throw new Error(`cannot modify session on ${input.date}: it has recorded attendance`)
      }
    }

    if (input.type === 'rescheduled' || input.type === 'extra') {
      // The landing date (reschedule target / added date) must be today-or-later
      // and must not collide with another effective Session; it need not land on a
      // Meeting Day (ADR-0039).
      const landing = input.type === 'rescheduled' ? input.newDate : input.date
      if (!landing) {
        throw new Error('cannot reschedule session: newDate is required')
      }
      if (!onOrAfterToday(landing)) {
        throw new Error(`cannot schedule session on ${landing}: the date is in the past`)
      }
      // A reschedule frees up its own original slot, so that Session never counts
      // as a collision against its own move; an extra frees nothing.
      const freedDate = input.type === 'rescheduled' ? input.date : null
      const collides = current.some(
        (s) =>
          (freedDate === null || !isSameDay(parseISO(s.date), parseISO(freedDate))) &&
          isSameDay(parseISO(s.date), parseISO(landing))
      )
      if (collides) {
        throw new Error(
          `cannot schedule session on ${landing}: it collides with an existing session`
        )
      }
    }

    const exception: SessionException = {
      id: nextId('sxc', state.sessionExceptions),
      courseId: input.courseId,
      type: input.type,
      date: input.date,
      ...(input.newDate !== undefined ? { newDate: input.newDate } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      createdAt: clock.now().toISOString(),
    }
    // ADR-0039 pairs this deviation with an auto-posted `sessionChange`
    // Announcement (ADR-0040), composed into THIS same store action: one mutation
    // yields the exception, the announcement, and both audit entries — never a
    // second round-trip a caller could forget. No second assertCan: the writer
    // already cleared `edit courses` + ownership above, which is exactly the
    // audience allowed to post to the Course feed (announcements: courseOwned).
    // The announcement shares the exception's `createdAt`, and its body is derived
    // in the store's active locale so a schedule change is never typed twice.
    withAudits(set, (state) => {
      const announcement: Announcement = {
        id: nextId('ann', state.announcements),
        courseId: input.courseId,
        body: sessionChangeAnnouncementBody(state.locale, exception),
        kind: 'sessionChange',
        createdAt: exception.createdAt,
      }
      return {
        next: {
          sessionExceptions: [...state.sessionExceptions, exception],
          announcements: [...state.announcements, announcement],
        },
        audits: [
          {
            action: 'create',
            entity: 'session',
            entityId: exception.id,
            summary: sessionExceptionSummary(course, exception),
          },
          {
            action: 'create',
            entity: 'announcement',
            entityId: announcement.id,
            summary: `Auto-posted session-change announcement ${announcement.id} for ${course.name}`,
          },
        ],
      }
    })
    return exception
  },
  createAnnouncement: (input) => {
    const state = get()
    const course = state.courses.find((c) => c.id === input.courseId)
    if (!course) {
      throw new Error(`cannot post announcement: unknown course ${input.courseId}`)
    }
    // Writers are the Course's own Teacher (courseOwned) or admin (ADR-0040):
    // assertCan throws on a violation before anything is written (ADR-0009). A
    // Student has no create cell, so this is the store boundary that stops a
    // Student ever posting, independent of any UI gate.
    assertCan(state, 'create', 'announcements', {
      course,
      userId: state.currentUserId ?? undefined,
    })
    // A closed cohort is terminal (ADR-0024): no new feed activity, mirroring the
    // session-exception guard. The UI hides the compose box; the store is the real
    // boundary.
    if (course.status === 'closed') {
      throw new Error(`cannot post announcement to course ${input.courseId}: it is closed`)
    }
    const body = input.body.trim()
    if (body.length === 0) {
      throw new Error('cannot post an empty announcement')
    }
    const announcement: Announcement = {
      id: nextId('ann', state.announcements),
      courseId: input.courseId,
      body,
      kind: 'manual',
      createdAt: clock.now().toISOString(),
    }
    withAudit(set, (state) => ({
      next: {
        announcements: [...state.announcements, announcement],
      },
      audit: {
        action: 'create',
        entity: 'announcement',
        entityId: announcement.id,
        summary: `Posted announcement ${announcement.id} to ${course.name}`,
      },
    }))
    return announcement
  },
  deleteAnnouncement: (id) => {
    const state = get()
    const target = state.announcements.find((a) => a.id === id)
    if (!target) return
    const course = state.courses.find((c) => c.id === target.courseId)
    if (!course) {
      throw new Error(`cannot delete announcement ${id}: unknown course ${target.courseId}`)
    }
    // Deleting is teacher-own/admin (ADR-0040) — the same ownership gate as posting.
    // There is no edit: a correction is a new post, so removal is the only mutation
    // of an existing post.
    assertCan(state, 'delete', 'announcements', {
      course,
      userId: state.currentUserId ?? undefined,
    })
    withAudit(set, (state) => ({
      next: {
        announcements: state.announcements.filter((a) => a.id !== id),
      },
      audit: {
        action: 'delete',
        entity: 'announcement',
        entityId: id,
        summary: `Deleted announcement ${id} from ${course.name}`,
      },
    }))
  },
  sendEmailCampaign: (input) => {
    const existing = get()
    // Re-check Course ownership on send (ADR-0009, ADR-0041): admin's `create`
    // cell is unconditional, but a Teacher's is `courseOwned`, so a course-scoped
    // send is only allowed on a Course they own. Resolve that Course from the
    // filter and pass it as context — a Teacher sending to a Course they don't
    // teach (or with any non-course filter) is rejected here, independent of the
    // locked-down form. The form is defense-in-depth; this is the boundary.
    const course =
      input.filter.kind === 'course' && input.filter.value
        ? existing.courses.find((c) => c.id === input.filter.value)
        : undefined
    assertCan(existing, 'create', 'bulkEmail', {
      course,
      userId: existing.currentUserId ?? undefined,
    })
    // A closed cohort is terminal (ADR-0024): no new class message on it, mirroring
    // the announcement/session-exception guards. The UI hides the "Message the
    // class" action on a closed Course; the store is the real boundary.
    if (course?.status === 'closed') {
      throw new Error(`cannot message course ${course.id}: it is closed`)
    }
    // The recipient count is over distinct emails, not Students (ADR-0041): an
    // 'both' send to N Students reaches up to 2N addresses, deduped for shared
    // Encargados. The stored recipientIds stay Student-typed (audit/traceability);
    // the audience + roster reproduce the email list wherever the count is shown.
    const recipientStudents = existing.students.filter((s) => input.recipientIds.includes(s.id))
    const emailCount = recipientEmails(recipientStudents, input.audience).length
    const campaign: EmailCampaign = {
      id: nextId('cam', existing.emailCampaigns),
      subject: input.subject,
      body: input.body,
      filter: input.filter,
      audience: input.audience,
      recipientIds: input.recipientIds,
      sentAt: clock.now().toISOString(),
      sentBy: existing.currentUserId ?? 'system',
    }
    withAudit(set, (state) => ({
      next: {
        emailCampaigns: [campaign, ...state.emailCampaigns],
      },
      audit: {
        action: 'create',
        entity: 'emailCampaign',
        entityId: campaign.id,
        summary: `Sent email "${campaign.subject}" to ${emailCount} recipients`,
      },
    }))
    return campaign
  },
}))

// Debounced persistence (200ms). Prevents rapid mutations (e.g. typing in
// a form) from serializing the entire snapshot on every keystroke.
const persistSnapshot = debounce((state: StoreState) => {
  savePersistedState({
    demoEpoch: state.demoEpoch,
    offset: state.offset,
    programs: state.programs,
    students: state.students,
    teachers: state.teachers,
    courses: state.courses,
    enrollments: state.enrollments,
    grades: state.grades,
    certificates: state.certificates,
    tcuTrainees: state.tcuTrainees,
    tcuActivities: state.tcuActivities,
    attendance: state.attendance,
    sessionExceptions: state.sessionExceptions,
    announcements: state.announcements,
    auditLog: state.auditLog,
    emailCampaigns: state.emailCampaigns,
  })
}, 200)

useStore.subscribe((state) => {
  persistSnapshot(state)
})
