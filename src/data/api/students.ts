import type { Student } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface StudentFilters {
  search?: string
  sede?: string
  educationalLevel?: string
}

function applyFilters(students: Student[], filters: StudentFilters): Student[] {
  const { search, sede, educationalLevel } = filters
  return students.filter((s) => {
    if (
      search &&
      !`${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (sede && s.sede !== sede) return false
    if (educationalLevel && s.educationalLevel !== educationalLevel) return false
    return true
  })
}

export const studentsApi = {
  async list(filters: StudentFilters = {}): Promise<Student[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const students = state.students
    const scope = scopeFor(role)['students']
    const scoped = applyScope('students', scope, students, state)
    return applyFilters(scoped, filters)
  },
  async get(id: string): Promise<Student | null> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const students = state.students
    const scope = scopeFor(role)['students']
    const scoped = applyScope('students', scope, students, state)
    return scoped.find((s) => s.id === id) ?? null
  },
}
