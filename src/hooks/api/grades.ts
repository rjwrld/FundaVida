import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { GradeFilters } from '@/data/api/grades'
import { makeEntityMutation } from './makeEntityMutation'
import { GRADES_KEY } from './queryKeys'

export function useGrades(filters: GradeFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...GRADES_KEY, role, filters],
    queryFn: () => api.grades.list(filters),
  })
}

export const useUpdateGradeScore = makeEntityMutation('updateGradeScore')<{
  id: string
  score: number
}>({
  toastKey: 'toasts.gradeSaved',
  args: ({ id, score }) => [id, score],
})

export const useDeleteGrade = makeEntityMutation('deleteGrade')({
  toastKey: 'toasts.gradeDeleted',
})
