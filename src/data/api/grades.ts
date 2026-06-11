import type { Grade } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface GradeFilters {
  studentId?: string
  courseId?: string
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
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const grades = state.grades
    const scope = scopeFor(role)['grades']
    const scoped = applyScope('grades', scope, grades)
    return applyFilters(scoped, filters)
  },
}
