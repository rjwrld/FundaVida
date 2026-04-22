import type { Grade } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface GradeFilters {
  studentId?: string
  courseId?: string
}

function applyRoleFilter(grades: Grade[]): Grade[] {
  const role = useStore.getState().role
  if (role === 'admin') return grades
  return []
}

function applyFilters(grades: Grade[], filters: GradeFilters): Grade[] {
  return grades.filter((g) => {
    if (filters.studentId && g.studentId !== filters.studentId) return false
    if (filters.courseId && g.courseId !== filters.courseId) return false
    return true
  })
}

export const gradesApi = {
  async list(filters: GradeFilters = {}): Promise<Grade[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().grades), filters)
  },
  async get(id: string): Promise<Grade | null> {
    await delay()
    const visible = applyRoleFilter(useStore.getState().grades)
    return visible.find((g) => g.id === id) ?? null
  },
}
