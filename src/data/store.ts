import { create } from 'zustand'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  TcuActivity,
  AttendanceRecord,
  AuditLogEntry,
  EmailCampaign,
  EmailFilter,
  Role,
} from '@/types'
import { can, type Action, type Resource, type PermissionContext } from '@/permissions'
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
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
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
  createTeacher: (input: Omit<Teacher, 'id' | 'createdAt' | 'courseIds'>) => Teacher
  updateTeacher: (id: string, patch: Partial<Omit<Teacher, 'id'>>) => void
  deleteTeacher: (id: string) => void
  enrollStudent: (studentId: string, courseId: string) => Enrollment
  unenrollStudent: (enrollmentId: string) => void
  setGrade: (studentId: string, courseId: string, score: number) => Grade
  updateGradeScore: (gradeId: string, score: number) => void
  deleteGrade: (gradeId: string) => void
  markAttendance: (
    courseId: string,
    studentId: string,
    sessionDate: string,
    status: AttendanceRecord['status']
  ) => AttendanceRecord
  sendEmailCampaign: (input: {
    subject: string
    body: string
    filter: EmailFilter
    recipientIds: string[]
  }) => EmailCampaign
}

function userIdForRole(role: Role): string {
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
    actorId: state.currentUserId ?? 'system',
    timestamp: new Date().toISOString(),
    ...entry,
  }
}

export function withAudit(
  set: (fn: (state: StoreState) => Partial<StoreState>) => void,
  recipe: (state: StoreState) => { next: Partial<StoreState>; audit: AuditDescriptor }
): void {
  set((state) => {
    const { next, audit } = recipe(state)
    return {
      ...next,
      auditLog: [makeAuditEntry(state, audit), ...state.auditLog],
    }
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
  | 'students'
  | 'teachers'
  | 'courses'
  | 'enrollments'
  | 'grades'
  | 'tcuActivities'
  | 'attendance'
  | 'auditLog'
  | 'emailCampaigns'
  | 'role'
  | 'currentUserId'
  | 'locale'
> {
  const persisted = loadPersistedState()
  const role = loadPersistedRole()
  const currentUserId = loadPersistedCurrentUser()
  const locale = detectInitialLocale()
  if (persisted) {
    return {
      students: persisted.students,
      teachers: persisted.teachers,
      courses: persisted.courses,
      enrollments: persisted.enrollments,
      grades: persisted.grades,
      tcuActivities: persisted.tcuActivities,
      attendance: persisted.attendance,
      auditLog: persisted.auditLog,
      emailCampaigns: persisted.emailCampaigns,
      role,
      currentUserId,
      locale,
    }
  }
  const snapshot = seedDemo(new Date())
  return { ...snapshot, role, currentUserId, locale }
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
    const snapshot = seedDemo(new Date())
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
      createdAt: new Date().toISOString(),
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
        summary: `Created student ${student.firstName} ${student.lastName}`,
      },
    }))
    return student
  },
  updateStudent: (id, patch) => {
    const existing = get()
    assertCan(existing, 'edit', 'students')
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
        attendance: state.attendance.filter((a) => a.studentId !== id),
        tcuActivities: state.tcuActivities.filter((a) => a.studentId !== id),
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
      createdAt: new Date().toISOString(),
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
  createTeacher: (input) => {
    const existing = get()
    assertCan(existing, 'create', 'teachers')
    const teacher: Teacher = {
      id: nextId('tea', existing.teachers),
      createdAt: new Date().toISOString(),
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
        summary: `Created teacher ${teacher.firstName} ${teacher.lastName}`,
      },
    }))
    return teacher
  },
  updateTeacher: (id, patch) => {
    const existing = get()
    assertCan(existing, 'edit', 'teachers')
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
    assertCan(state, 'create', 'enrollments')
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
    // A Student may only enrol in Courses at their own Sede (ADR-0011). The Enroll
    // dialog filters to same-Sede students, so this guards direct callers and
    // should never reach end users.
    if (student.sede !== course.sede) {
      throw new Error(
        `cannot enroll student ${studentId} (${student.sede}) in course ${courseId} (${course.sede}): Sede mismatch`
      )
    }
    const enrollment: Enrollment = {
      id: nextId('enr', enrollments),
      studentId,
      courseId,
      enrolledAt: new Date().toISOString(),
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
      const updated: Grade = { ...existing, score, issuedAt: new Date().toISOString() }
      withAudit(set, (state) => ({
        next: {
          grades: state.grades.map((g) => (g.id === existing.id ? updated : g)),
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
      issuedAt: new Date().toISOString(),
    }
    withAudit(set, (state) => ({
      next: {
        grades: [...state.grades, grade],
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
          g.id === gradeId ? { ...g, score, issuedAt: new Date().toISOString() } : g
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
  sendEmailCampaign: (input) => {
    const existing = get()
    assertCan(existing, 'create', 'bulkEmail')
    const campaign: EmailCampaign = {
      id: nextId('cam', existing.emailCampaigns),
      subject: input.subject,
      body: input.body,
      filter: input.filter,
      recipientIds: input.recipientIds,
      sentAt: new Date().toISOString(),
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
        summary: `Sent email "${campaign.subject}" to ${campaign.recipientIds.length} recipients`,
      },
    }))
    return campaign
  },
}))

// Debounced persistence (200ms). Prevents rapid mutations (e.g. typing in
// a form) from serializing the entire snapshot on every keystroke.
const persistSnapshot = debounce((state: StoreState) => {
  savePersistedState({
    students: state.students,
    teachers: state.teachers,
    courses: state.courses,
    enrollments: state.enrollments,
    grades: state.grades,
    tcuActivities: state.tcuActivities,
    attendance: state.attendance,
    auditLog: state.auditLog,
    emailCampaigns: state.emailCampaigns,
  })
}, 200)

useStore.subscribe((state) => {
  persistSnapshot(state)
})
