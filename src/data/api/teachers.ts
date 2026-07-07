import type { Teacher } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

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
  async list(filters: TeacherFilters = {}): Promise<Teacher[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const teachers = state.teachers
    const scope = scopeFor(role)['teachers']
    const scoped = applyScope('teachers', scope, teachers, state)
    return applyFilters(scoped, filters)
  },
  async get(id: string): Promise<Teacher | null> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const teachers = state.teachers
    const scope = scopeFor(role)['teachers']
    const scoped = applyScope('teachers', scope, teachers, state)
    return scoped.find((t) => t.id === id) ?? null
  },
}
