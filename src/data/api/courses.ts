import type { Course } from '@/types'
import type { Scope } from '@/permissions'
import { useStore } from '../store'
import { clock } from '@/lib/clock'
import { isOpenForEnrollment } from '@/lib/courseDisplayState'
import { scopedGet, scopedList } from './scopedRead'
import { delay } from './_delay'

export interface CourseFilters {
  search?: string
  sede?: string
  programId?: string
  scopeOverride?: Scope
  /**
   * Restrict a list to cohorts actually open for enrollment (ADR-0042, issue
   * #257): a Term-ended (or draft/closed) published course is dropped. The Browse
   * page opts in explicitly rather than the filter inferring intent from a scope
   * token — the Term-agnostic `browseable` scope stays reusable for a plain
   * view-access read that wants Term-ended courses too.
   */
  openOnly?: boolean
}

function applyFilters(courses: Course[], filters: CourseFilters): Course[] {
  const { search, sede, programId, openOnly } = filters
  // `openOnly` narrows the Term-agnostic `browseable` scope so a list titled
  // "open courses" surfaces only enrollable cohorts, while `get` (which bypasses
  // applyFilters) can still serve a Term-ended course's viewable detail. One
  // term-end seam: `isOpenForEnrollment`, no re-derivation of the Term boundary.
  const now = clock.now()
  return courses.filter((c) => {
    if (openOnly && !isOpenForEnrollment(c, now)) return false
    if (search && !`${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (sede && c.sede !== sede) return false
    if (programId && c.programId !== programId) return false
    return true
  })
}

export const coursesApi = {
  list(filters: CourseFilters = {}): Promise<Course[]> {
    return scopedList('courses', filters, applyFilters, filters.scopeOverride)
  },
  get(id: string, scopeOverride?: Scope): Promise<Course | null> {
    return scopedGet('courses', id, scopeOverride)
  },
  /**
   * Seats left in a Course = capacity − approved enrollments. An aggregate count
   * the data layer computes from the full roster; it never exposes who is enrolled,
   * so a Student browsing an open Course (whose 'own' enrollment scope cannot see
   * other students') still gets an accurate availability signal (issue #166).
   */
  async seatsRemaining(courseId: string): Promise<number> {
    await delay()
    const state = useStore.getState()
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) return 0
    const approved = state.enrollments.filter(
      (e) => e.courseId === courseId && e.status === 'approved'
    ).length
    return Math.max(0, course.capacity - approved)
  },
}
