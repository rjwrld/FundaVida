import type { Teacher } from '@/types'
import { scopedGet, scopedList } from './scopedRead'

export interface TeacherFilters {
  search?: string
}

function applyFilters(teachers: Teacher[], filters: TeacherFilters): Teacher[] {
  const { search } = filters
  if (!search) return teachers
  const q = search.toLowerCase()
  return teachers.filter((t) => `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(q))
}

export const teachersApi = {
  list(filters: TeacherFilters = {}): Promise<Teacher[]> {
    return scopedList('teachers', filters, applyFilters)
  },
  get(id: string): Promise<Teacher | null> {
    return scopedGet('teachers', id)
  },
}
