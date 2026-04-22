import type { Student } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface StudentFilters {
  search?: string
  province?: string
  educationalLevel?: string
}

function applyRoleFilter(students: Student[]): Student[] {
  const role = useStore.getState().role
  if (role === 'admin' || role === 'teacher') return students
  return []
}

function applyFilters(students: Student[], filters: StudentFilters): Student[] {
  const { search, province, educationalLevel } = filters
  return students.filter((s) => {
    if (
      search &&
      !`${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (province && s.province !== province) return false
    if (educationalLevel && s.educationalLevel !== educationalLevel) return false
    return true
  })
}

export const studentsApi = {
  async list(filters: StudentFilters = {}): Promise<Student[]> {
    await delay()
    const students = useStore.getState().students
    return applyFilters(applyRoleFilter(students), filters)
  },
  async get(id: string): Promise<Student | null> {
    await delay()
    const students = useStore.getState().students
    return students.find((s) => s.id === id) ?? null
  },
}
