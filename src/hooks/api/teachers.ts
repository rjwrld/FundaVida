import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { TeacherFilters } from '@/data/api/teachers'
import type { Teacher } from '@/types'
import { makeEntityMutation } from './makeEntityMutation'
import { TEACHERS_KEY } from './queryKeys'

const teacherKey = (id: string) => [...TEACHERS_KEY, id] as const

export function useTeachers(filters: TeacherFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...TEACHERS_KEY, role, filters],
    queryFn: () => api.teachers.list(filters),
  })
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: teacherKey(id),
    queryFn: () => api.teachers.get(id),
    enabled: id.length > 0,
  })
}

export const useCreateTeacher = makeEntityMutation('createTeacher')({
  toastKey: 'toasts.teacherCreated',
})

export const useUpdateTeacher = makeEntityMutation('updateTeacher')<{
  id: string
  patch: Partial<Teacher>
}>({
  toastKey: 'toasts.teacherUpdated',
  args: ({ id, patch }) => [id, patch],
})

export const useDeleteTeacher = makeEntityMutation('deleteTeacher')({
  toastKey: 'toasts.teacherDeleted',
})
