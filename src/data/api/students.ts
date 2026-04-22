import type { Student } from '@/types'
import { useStore } from '../store'

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyRoleFilter(students: Student[]): Student[] {
  const role = useStore.getState().role
  if (role === 'admin' || role === 'teacher') return students
  // Student and TCU roles see nothing in the generic list endpoint by
  // default; hero flows in Phase 3 will refine this with self-scoped
  // reads once current-user identity exists.
  return []
}

export const studentsApi = {
  async list(): Promise<Student[]> {
    await delay()
    const students = useStore.getState().students
    return applyRoleFilter(students)
  },
  async get(id: string): Promise<Student | null> {
    await delay()
    const students = useStore.getState().students
    return students.find((s) => s.id === id) ?? null
  },
}
