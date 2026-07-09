import type { Teacher } from '@/types'
import { fullName } from '@/lib/personName'
import { scopedGet, scopedList } from './scopedRead'

export interface TeacherFilters {
  search?: string
}

function applyFilters(teachers: Teacher[], filters: TeacherFilters): Teacher[] {
  const { search } = filters
  if (!search) return teachers
  const q = search.toLowerCase()
  return teachers.filter((t) => `${fullName(t)} ${t.email}`.toLowerCase().includes(q))
}

export const teachersApi = {
  list(filters: TeacherFilters = {}): Promise<Teacher[]> {
    return scopedList('teachers', filters, applyFilters)
  },
  get(id: string): Promise<Teacher | null> {
    return scopedGet('teachers', id)
  },
}
