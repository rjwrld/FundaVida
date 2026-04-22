import { create } from 'zustand'
import type { Student, Teacher, Course, Enrollment, Grade, Role } from '@/types'
import { buildSeedSnapshot } from './seed'
import {
  loadPersistedRole,
  loadPersistedState,
  savePersistedRole,
  savePersistedState,
} from './persistence'

export interface StoreState {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  role: Role | null
  setRole: (role: Role) => void
  resetDemo: () => void
}

function initialState(): Omit<StoreState, 'setRole' | 'resetDemo'> {
  const persisted = loadPersistedState()
  if (persisted) {
    return {
      students: persisted.students,
      teachers: persisted.teachers,
      courses: persisted.courses,
      enrollments: persisted.enrollments,
      grades: persisted.grades,
      role: loadPersistedRole(),
    }
  }
  const snapshot = buildSeedSnapshot()
  return { ...snapshot, role: loadPersistedRole() }
}

export const useStore = create<StoreState>((set) => ({
  ...initialState(),
  setRole: (role) => {
    savePersistedRole(role)
    set({ role })
  },
  resetDemo: () => {
    const snapshot = buildSeedSnapshot()
    set({
      ...snapshot,
      role: null,
    })
    savePersistedState({ ...snapshot, role: null })
  },
}))

// Persist on every state change.
useStore.subscribe((state) => {
  savePersistedState({
    students: state.students,
    teachers: state.teachers,
    courses: state.courses,
    enrollments: state.enrollments,
    grades: state.grades,
    role: state.role,
  })
})
