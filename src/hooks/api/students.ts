import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Student } from '@/types'

const STUDENTS_KEY = ['students'] as const
const studentKey = (id: string) => ['students', id] as const

export function useStudents() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...STUDENTS_KEY, role],
    queryFn: () => api.students.list(),
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKey(id),
    queryFn: () => api.students.get(id),
  })
}

export function useCreateStudent() {
  const client = useQueryClient()
  const createStudent = useStore((s) => s.createStudent)
  return useMutation({
    mutationFn: async (input: Parameters<typeof createStudent>[0]) => {
      return createStudent(input)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
    },
  })
}

export function useUpdateStudent() {
  const client = useQueryClient()
  const updateStudent = useStore((s) => s.updateStudent)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Student> }) => {
      updateStudent(id, patch)
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
      client.invalidateQueries({ queryKey: studentKey(id) })
    },
  })
}

export function useDeleteStudent() {
  const client = useQueryClient()
  const deleteStudent = useStore((s) => s.deleteStudent)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteStudent(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
    },
  })
}
