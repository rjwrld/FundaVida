import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { TeacherFilters } from '@/data/api/teachers'
import type { Teacher } from '@/types'

const TEACHERS_KEY = ['teachers'] as const
const teacherKey = (id: string) => ['teachers', id] as const

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

export function useCreateTeacher() {
  const client = useQueryClient()
  const createTeacher = useStore((s) => s.createTeacher)
  return useMutation({
    mutationFn: async (input: Parameters<typeof createTeacher>[0]) => {
      return createTeacher(input)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}

export function useUpdateTeacher() {
  const client = useQueryClient()
  const updateTeacher = useStore((s) => s.updateTeacher)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Teacher> }) => {
      updateTeacher(id, patch)
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
      client.invalidateQueries({ queryKey: teacherKey(id) })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}

export function useDeleteTeacher() {
  const client = useQueryClient()
  const deleteTeacher = useStore((s) => s.deleteTeacher)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteTeacher(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}
