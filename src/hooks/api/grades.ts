import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { GradeFilters } from '@/data/api/grades'

const GRADES_KEY = ['grades'] as const

export function useGrades(filters: GradeFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...GRADES_KEY, role, filters],
    queryFn: () => api.grades.list(filters),
  })
}

export function useUpdateGradeScore() {
  const client = useQueryClient()
  const updateGradeScore = useStore((s) => s.updateGradeScore)
  return useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      updateGradeScore(id, score)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: GRADES_KEY })
    },
  })
}

export function useDeleteGrade() {
  const client = useQueryClient()
  const deleteGrade = useStore((s) => s.deleteGrade)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteGrade(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: GRADES_KEY })
    },
  })
}
