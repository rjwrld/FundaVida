import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { StudentFilters } from '@/data/api/students'
import type { Student } from '@/types'
import { makeEntityMutation } from './makeEntityMutation'
import { STUDENTS_KEY } from './queryKeys'

const studentKey = (id: string) => [...STUDENTS_KEY, id] as const

// Role is captured in the queryKey so cache entries per role are isolated.
// When the role changes, Zustand triggers a re-render, React Query sees a new
// queryKey, and refetches with the new role applied via the API layer's
// role-aware filter.
export function useStudents(filters: StudentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...STUDENTS_KEY, role, filters],
    queryFn: () => api.students.list(filters),
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKey(id),
    queryFn: () => api.students.get(id),
    enabled: id.length > 0,
  })
}

// The logged-in Student's own record, read through the self-scoped students seam
// (issue #166). Returns null for any role without an own student record (admin/
// teacher/tcu), so the /app/me page can fall back gracefully. Role is in the key
// so the cached entry is isolated per role.
export function useCurrentStudent() {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...STUDENTS_KEY, 'me', role, userId],
    queryFn: () => (userId ? api.students.get(userId) : Promise.resolve(null)),
    enabled: !!userId,
  })
}

export const useCreateStudent = makeEntityMutation('createStudent')({
  toastKey: 'toasts.studentCreated',
})

export const useUpdateStudent = makeEntityMutation('updateStudent')<{
  id: string
  patch: Partial<Student>
}>({
  toastKey: 'toasts.studentUpdated',
  args: ({ id, patch }) => [id, patch],
})

export const useDeleteStudent = makeEntityMutation('deleteStudent')({
  toastKey: 'toasts.studentDeleted',
})
