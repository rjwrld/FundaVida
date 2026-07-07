import type { Enrollment } from '@/types'
import { scopedList } from './scopedRead'

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
  list(filters: EnrollmentFilters = {}): Promise<Enrollment[]> {
    return scopedList('enrollments', filters, applyFilters)
  },
}
