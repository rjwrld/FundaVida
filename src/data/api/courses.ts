import type { Course } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface CourseFilters {
  search?: string
  headquartersName?: string
  programName?: string
}

function applyRoleFilter(courses: Course[]): Course[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return courses
  if (role === 'teacher' && state.currentUserId) {
    return courses.filter((c) => c.teacherId === state.currentUserId)
  }
  if (role === 'student' && state.currentUserId) {
    const enrollments = state.enrollments.filter((e) => e.studentId === state.currentUserId)
    const courseIds = new Set(enrollments.map((e) => e.courseId))
    return courses.filter((c) => courseIds.has(c.id))
  }
  return []
}

function applyFilters(courses: Course[], filters: CourseFilters): Course[] {
  const { search, headquartersName, programName } = filters
  return courses.filter((c) => {
    if (search && !`${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (headquartersName && c.headquartersName !== headquartersName) return false
    if (programName && c.programName !== programName) return false
    return true
  })
}

export const coursesApi = {
  async list(filters: CourseFilters = {}): Promise<Course[]> {
    await delay()
    const courses = useStore.getState().courses
    return applyFilters(applyRoleFilter(courses), filters)
  },
  async get(id: string): Promise<Course | null> {
    await delay()
    const courses = useStore.getState().courses
    return courses.find((c) => c.id === id) ?? null
  },
}
