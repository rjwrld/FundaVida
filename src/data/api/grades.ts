import type { Grade } from '@/types'
import { scopedList } from './scopedRead'

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
  list(filters: GradeFilters = {}): Promise<Grade[]> {
    return scopedList('grades', filters, applyFilters)
  },
}
