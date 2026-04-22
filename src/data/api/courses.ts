import type { Course } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

function applyRoleFilter(courses: Course[]): Course[] {
  const role = useStore.getState().role
  if (role === 'admin') return courses
  if (role === 'teacher') {
    // Teachers see only their own courses. Until current-user identity
    // exists, teachers see everything taught by tea-1 as a stand-in.
    // Phase 3 tightens this once the hero flow introduces a current-
    // user concept.
    return courses.filter((c) => c.teacherId === 'tea-1')
  }
  // Students and TCU roles see nothing in the generic list endpoint by
  // default; Phase 3 hero flows will refine this with self-scoped
  // reads once current-user identity exists.
  return []
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
