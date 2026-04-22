import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetGrade } from '@/hooks/api'
import { gradeSchema, type GradeFormValues } from '@/data/schemas/grade'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  studentId: string
  courseId: string
  studentName: string
  initialScore?: number
}

export function GradeDialog({
  open,
  onOpenChange,
  studentId,
  courseId,
  studentName,
  initialScore,
}: Props) {
  const setGrade = useSetGrade()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { score: initialScore ?? 0 },
  })

  useEffect(() => {
    reset({ score: initialScore ?? 0 })
  }, [initialScore, reset, open])

  async function onSubmit(values: GradeFormValues) {
    await setGrade.mutateAsync({ studentId, courseId, score: values.score })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade {studentName}</DialogTitle>
          <DialogDescription>Enter a score between 0 and 100.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              step={1}
              aria-invalid={errors.score !== undefined}
              aria-describedby={errors.score ? 'grade-score-error' : undefined}
              {...register('score', { valueAsNumber: true })}
            />
            {errors.score && (
              <p id="grade-score-error" role="alert" className="text-xs text-destructive">
                {errors.score.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save grade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
