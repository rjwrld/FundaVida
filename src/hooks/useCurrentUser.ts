import { useStore } from '@/data/store'
import type { Student, Teacher } from '@/types'

export interface CurrentUser {
  id: string
  role: 'admin' | 'teacher' | 'student' | 'tcu'
  teacher?: Teacher
  student?: Student
}

export function useCurrentUser(): CurrentUser | null {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const teacher = useStore((s) =>
    role === 'teacher' && userId ? s.teachers.find((t) => t.id === userId) : undefined
  )
  const student = useStore((s) =>
    role === 'student' && userId ? s.students.find((t) => t.id === userId) : undefined
  )
  if (!role || !userId) return null
  if (role === 'teacher' && !teacher) return null
  if (role === 'student' && !student) return null
  return { id: userId, role, teacher, student }
}
