import type { Course } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface CourseFilters {
  search?: string
  sede?: string
  programId?: string
}

function applyFilters(courses: Course[], filters: CourseFilters): Course[] {
  const { search, sede, programId } = filters
  return courses.filter((c) => {
    if (search && !`${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (sede && c.sede !== sede) return false
    if (programId && c.programId !== programId) return false
    return true
  })
}

export const coursesApi = {
  async list(filters: CourseFilters = {}): Promise<Course[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const courses = state.courses
    const scope = scopeFor(role)['courses']
    const scoped = applyScope('courses', scope, courses)
    return applyFilters(scoped, filters)
  },
  async get(id: string): Promise<Course | null> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const courses = state.courses
    const scope = scopeFor(role)['courses']
    const scoped = applyScope('courses', scope, courses)
    return scoped.find((c) => c.id === id) ?? null
  },
}
