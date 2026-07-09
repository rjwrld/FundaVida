import type { Student } from '@/types'
import { fullName } from '@/lib/personName'
import { scopedGet, scopedList } from './scopedRead'

export interface StudentFilters {
  search?: string
  sede?: string
  educationalLevel?: string
}

function applyFilters(students: Student[], filters: StudentFilters): Student[] {
  const { search, sede, educationalLevel } = filters
  return students.filter((s) => {
    if (search && !`${fullName(s)} ${s.email}`.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (sede && s.sede !== sede) return false
    if (educationalLevel && s.educationalLevel !== educationalLevel) return false
    return true
  })
}

export const studentsApi = {
  list(filters: StudentFilters = {}): Promise<Student[]> {
    return scopedList('students', filters, applyFilters)
  },
  get(id: string): Promise<Student | null> {
    return scopedGet('students', id)
  },
}
