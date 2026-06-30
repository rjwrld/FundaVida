import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { GradeFilters } from '@/data/api/grades'
import { makeEntityMutation } from './makeEntityMutation'

const GRADES_KEY = ['grades'] as const

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
  // A post-close score correction reconciles the Certificate (ADR-0025): below 70
  // revokes it, at/above 70 re-issues it. So invalidate ['certificates'] (gallery +
  // in-course section) and ['courses'] alongside ['grades'], or those reads go stale.
  invalidates: [GRADES_KEY, ['certificates'], ['courses']],
  args: ({ id, score }) => [id, score],
})

export const useDeleteGrade = makeEntityMutation('deleteGrade')({
  toastKey: 'toasts.gradeDeleted',
  invalidates: [GRADES_KEY],
})
