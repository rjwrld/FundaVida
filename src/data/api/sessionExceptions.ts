import type { SessionException } from '@/types'
import { scopedList } from './scopedRead'

export interface SessionExceptionFilters {
  courseId?: string
}

function applyFilters(
  exceptions: SessionException[],
  filters: SessionExceptionFilters
): SessionException[] {
  return exceptions.filter((e) => {
    if (filters.courseId && e.courseId !== filters.courseId) return false
    return true
  })
}

export const sessionExceptionsApi = {
  list(filters: SessionExceptionFilters = {}): Promise<SessionException[]> {
    return scopedList('sessionExceptions', filters, applyFilters)
  },
}
