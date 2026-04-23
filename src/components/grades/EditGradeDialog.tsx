import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateGradeScore } from '@/hooks/api'
import { buildGradeSchema, type GradeFormValues } from '@/data/schemas/grade'

interface Props {
  gradeId: string | null
  initialScore: number
  studentName: string
  courseName: string
  onClose: () => void
}

export function EditGradeDialog({
  gradeId,
  initialScore,
  studentName,
  courseName,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const updateGrade = useUpdateGradeScore()
  const open = gradeId !== null
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GradeFormValues>({
    resolver: zodResolver(buildGradeSchema(t)),
    defaultValues: { score: initialScore },
  })

  useEffect(() => {
    reset({ score: initialScore })
  }, [gradeId, initialScore, reset, open])

  async function onSubmit(values: GradeFormValues) {
    if (!gradeId) return
    await updateGrade.mutateAsync({ id: gradeId, score: values.score })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('grades.dialog.editTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {studentName} — {courseName}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="score">{t('grades.dialog.scoreLabel')}</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              aria-invalid={errors.score !== undefined}
              aria-describedby={errors.score ? 'score-error' : undefined}
              {...register('score', { valueAsNumber: true })}
            />
            {errors.score && (
              <p id="score-error" role="alert" className="text-sm text-destructive">
                {errors.score.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || updateGrade.isPending}>
              {t('grades.dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
