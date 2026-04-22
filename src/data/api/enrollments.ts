import type { Enrollment } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface EnrollmentFilters {
  studentId?: string
  courseId?: string
}

function applyRoleFilter(enrollments: Enrollment[]): Enrollment[] {
  const role = useStore.getState().role
  if (role === 'admin') return enrollments
  return []
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
    return applyFilters(applyRoleFilter(useStore.getState().enrollments), filters)
  },
}
