import { create } from 'zustand'
import type { Student, Teacher, Course, Enrollment, Grade, TcuActivity, Role } from '@/types'
import { buildSeedSnapshot } from './seed'
import { debounce } from './debounce'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  loadPersistedCurrentUser,
  loadPersistedRole,
  loadPersistedState,
  savePersistedCurrentUser,
  savePersistedRole,
  savePersistedState,
} from './persistence'

export interface StoreState {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
  role: Role | null
  currentUserId: string | null
  setRole: (role: Role) => void
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

function initialState(): Pick<
  StoreState,
  | 'students'
  | 'teachers'
  | 'courses'
  | 'enrollments'
  | 'grades'
  | 'tcuActivities'
  | 'role'
  | 'currentUserId'
> {
  const persisted = loadPersistedState()
  const role = loadPersistedRole()
  const currentUserId = loadPersistedCurrentUser()
  if (persisted) {
    return {
      students: persisted.students,
      teachers: persisted.teachers,
      courses: persisted.courses,
      enrollments: persisted.enrollments,
      grades: persisted.grades,
      tcuActivities: persisted.tcuActivities,
      role,
      currentUserId,
    }
  }
  const snapshot = buildSeedSnapshot()
  return { ...snapshot, role, currentUserId }
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
  resetDemo: () => {
    const snapshot = buildSeedSnapshot()
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
    const { students } = get()
    const student: Student = {
      id: nextId('stu', students),
      createdAt: new Date().toISOString(),
      enrolledCourseIds: [],
      ...input,
    }
    set({ students: [...students, student] })
    return student
  },
  updateStudent: (id, patch) => {
    set({ students: get().students.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  },
  deleteStudent: (id) => {
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
      enrollments: state.enrollments.filter((e) => e.studentId !== id),
      grades: state.grades.filter((g) => g.studentId !== id),
    }))
  },
  createCourse: (input) => {
    const { courses, teachers } = get()
    const course: Course = {
      id: nextId('cou', courses),
      createdAt: new Date().toISOString(),
      ...input,
    }
    const updatedTeachers = teachers.map((t) =>
      t.id === course.teacherId ? { ...t, courseIds: [...t.courseIds, course.id] } : t
    )
    set({ courses: [...courses, course], teachers: updatedTeachers })
    return course
  },
  updateCourse: (id, patch) => {
    set((state) => {
      const current = state.courses.find((c) => c.id === id)
      const teacherChanged =
        current !== undefined &&
        patch.teacherId !== undefined &&
        patch.teacherId !== current.teacherId
      const updatedCourses = state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c))
      const newTeacherId = patch.teacherId
      if (!teacherChanged || !current || !newTeacherId) {
        return { courses: updatedCourses }
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
      return { courses: updatedCourses, teachers: updatedTeachers }
    })
  },
  deleteCourse: (id) => {
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      enrollments: state.enrollments.filter((e) => e.courseId !== id),
      grades: state.grades.filter((g) => g.courseId !== id),
      teachers: state.teachers.map((t) => ({
        ...t,
        courseIds: t.courseIds.filter((cid) => cid !== id),
      })),
      students: state.students.map((s) => ({
        ...s,
        enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== id),
      })),
    }))
  },
  createTeacher: (input) => {
    const { teachers } = get()
    const teacher: Teacher = {
      id: nextId('tea', teachers),
      createdAt: new Date().toISOString(),
      courseIds: [],
      ...input,
    }
    set({ teachers: [...teachers, teacher] })
    return teacher
  },
  updateTeacher: (id, patch) => {
    set({ teachers: get().teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  },
  deleteTeacher: (id) => {
    const { teachers } = get()
    const target = teachers.find((t) => t.id === id)
    if (!target) return
    if (target.courseIds.length > 0) {
      throw new Error(
        `Teacher ${id} has ${target.courseIds.length} course(s) assigned — reassign before deleting.`
      )
    }
    set({ teachers: teachers.filter((t) => t.id !== id) })
  },
  enrollStudent: (studentId, courseId) => {
    const { enrollments, students } = get()
    const existing = enrollments.find((e) => e.studentId === studentId && e.courseId === courseId)
    if (existing) return existing
    const enrollment: Enrollment = {
      id: nextId('enr', enrollments),
      studentId,
      courseId,
      enrolledAt: new Date().toISOString(),
    }
    const updatedStudents = students.map((s) =>
      s.id === studentId && !s.enrolledCourseIds.includes(courseId)
        ? { ...s, enrolledCourseIds: [...s.enrolledCourseIds, courseId] }
        : s
    )
    set({ enrollments: [...enrollments, enrollment], students: updatedStudents })
    return enrollment
  },
  unenrollStudent: (enrollmentId) => {
    const { enrollments, students, grades } = get()
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) return
    const updatedStudents = students.map((s) =>
      s.id === target.studentId
        ? {
            ...s,
            enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== target.courseId),
          }
        : s
    )
    set({
      enrollments: enrollments.filter((e) => e.id !== enrollmentId),
      grades: grades.filter(
        (g) => !(g.studentId === target.studentId && g.courseId === target.courseId)
      ),
      students: updatedStudents,
    })
  },
  setGrade: (studentId, courseId, score) => {
    const { grades } = get()
    const existing = grades.find((g) => g.studentId === studentId && g.courseId === courseId)
    if (existing) {
      const updated: Grade = { ...existing, score, issuedAt: new Date().toISOString() }
      set({ grades: grades.map((g) => (g.id === existing.id ? updated : g)) })
      return updated
    }
    const grade: Grade = {
      id: nextId('gra', grades),
      studentId,
      courseId,
      score,
      issuedAt: new Date().toISOString(),
    }
    set({ grades: [...grades, grade] })
    return grade
  },
  updateGradeScore: (gradeId, score) => {
    set((state) => ({
      grades: state.grades.map((g) =>
        g.id === gradeId ? { ...g, score, issuedAt: new Date().toISOString() } : g
      ),
    }))
  },
  deleteGrade: (gradeId) => {
    set((state) => ({ grades: state.grades.filter((g) => g.id !== gradeId) }))
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
  })
}, 200)

useStore.subscribe((state) => {
  persistSnapshot(state)
})
