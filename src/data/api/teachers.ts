import type { Teacher } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface TeacherFilters {
  search?: string
}

function applyRoleFilter(teachers: Teacher[]): Teacher[] {
  const role = useStore.getState().role
  if (role === 'admin') return teachers
  return []
}

function applyFilters(teachers: Teacher[], filters: TeacherFilters): Teacher[] {
  const { search } = filters
  if (!search) return teachers
  const q = search.toLowerCase()
  return teachers.filter((t) => `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(q))
}

export const teachersApi = {
  async list(filters: TeacherFilters = {}): Promise<Teacher[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().teachers), filters)
  },
  async get(id: string): Promise<Teacher | null> {
    await delay()
    const visible = applyRoleFilter(useStore.getState().teachers)
    return visible.find((t) => t.id === id) ?? null
  },
}
