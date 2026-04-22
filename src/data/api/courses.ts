import type { Course } from '@/types'
import { useStore } from '../store'

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyRoleFilter(courses: Course[]): Course[] {
  const role = useStore.getState().role
  if (role === 'admin') return courses
  if (role === 'teacher') {
    // Teachers see only their own courses. Until current-user identity
    // exists, teachers see everything taught by tea-1 as a stand-in.
    // Phase 3 tightens this.
    return courses.filter((c) => c.teacherId === 'tea-1')
  }
  return courses
}

export const coursesApi = {
  async list(): Promise<Course[]> {
    await delay()
    const courses = useStore.getState().courses
    return applyRoleFilter(courses)
  },
  async get(id: string): Promise<Course | null> {
    await delay()
    const courses = useStore.getState().courses
    return courses.find((c) => c.id === id) ?? null
  },
}
