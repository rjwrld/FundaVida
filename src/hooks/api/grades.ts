import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      updateGradeScore(id, score)
    },
    onSuccess: () => {
      toast.success(t('toasts.gradeSaved'))
      client.invalidateQueries({ queryKey: GRADES_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}

export function useDeleteGrade() {
  const client = useQueryClient()
  const deleteGrade = useStore((s) => s.deleteGrade)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async (id: string) => {
      deleteGrade(id)
    },
    onSuccess: () => {
      toast.success(t('toasts.gradeDeleted'))
      client.invalidateQueries({ queryKey: GRADES_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}
