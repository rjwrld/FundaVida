import type { Enrollment } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface EnrollmentFilters {
  studentId?: string
  courseId?: string
}

function applyFilters(enrollments: Enrollment[], filters: EnrollmentFilters): Enrollment[] {
  return enrollments.filter((e) => {
    if (filters.studentId && e.studentId !== filters.studentId) return false
    if (filters.courseId && e.courseId !== filters.courseId) return false
    return true
  })
}

export const enrollmentsApi = {
  async list(filters: EnrollmentFilters = {}): Promise<Enrollment[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const enrollments = state.enrollments
    const scope = scopeFor(role)['enrollments']
    const scoped = applyScope('enrollments', scope, enrollments, state)
    return applyFilters(scoped, filters)
  },
}
