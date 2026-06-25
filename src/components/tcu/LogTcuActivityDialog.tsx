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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLogTcuActivity, useTcuTrainees } from '@/hooks/api'
import { useStore } from '@/data/store'
import { buildTcuActivitySchema, type TcuActivityFormValues } from '@/data/schemas/tcuActivity'

interface Props {
  open: boolean
  onClose: () => void
}

export function LogTcuActivityDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const logActivity = useLogTcuActivity()
  const { data: trainees = [] } = useTcuTrainees()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<TcuActivityFormValues>({
    resolver: zodResolver(buildTcuActivitySchema(t)),
    defaultValues: {
      title: '',
      hours: 1,
      date: new Date().toISOString().split('T')[0],
      traineeId: userId || '',
    },
  })

  const traineeId = watch('traineeId')

  // For TCU role, default to self; for admin, allow selection
  useEffect(() => {
    if (open) {
      if (role === 'tcu') {
        const selfId = userId
        setValue('traineeId', selfId || '')
      } else if (role === 'admin' && trainees.length > 0) {
        setValue('traineeId', trainees[0]?.id || '')
      }
    }
  }, [open, role, userId, trainees, setValue])

  async function onSubmit(values: TcuActivityFormValues) {
    if (!values.traineeId) return
    await logActivity.mutateAsync({
      traineeId: values.traineeId,
      title: values.title,
      hours: values.hours,
      date: new Date(values.date).toISOString(),
    })
    reset()
    onClose()
  }

  const currentTrainee = trainees.find((t) => t.id === traineeId)
  const isAdmin = role === 'admin'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tcu.dialog.logActivityTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
          {isAdmin && trainees.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="trainee">{t('tcu.dialog.traineeLabel')}</Label>
              <Select value={traineeId || ''} onValueChange={(v) => setValue('traineeId', v)}>
                <SelectTrigger id="trainee">
                  <SelectValue placeholder={t('tcu.dialog.traineePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map((trainee) => (
                    <SelectItem key={trainee.id} value={trainee.id}>
                      {trainee.firstName} {trainee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isAdmin && currentTrainee && (
            <p className="text-muted-foreground">
              {currentTrainee.firstName} {currentTrainee.lastName}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="title">{t('tcu.form.titleLabel')}</Label>
            <Input
              id="title"
              placeholder={t('tcu.form.titlePlaceholder')}
              aria-invalid={errors.title !== undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
              {...register('title')}
            />
            {errors.title && (
              <p id="title-error" role="alert" className="text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours">{t('tcu.form.hoursLabel')}</Label>
            <Input
              id="hours"
              type="number"
              min={1}
              max={100}
              aria-invalid={errors.hours !== undefined}
              aria-describedby={errors.hours ? 'hours-error' : undefined}
              {...register('hours', { valueAsNumber: true })}
            />
            {errors.hours && (
              <p id="hours-error" role="alert" className="text-sm text-destructive">
                {errors.hours.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">{t('tcu.form.dateLabel')}</Label>
            <Input
              id="date"
              type="date"
              aria-invalid={errors.date !== undefined}
              aria-describedby={errors.date ? 'date-error' : undefined}
              {...register('date')}
            />
            {errors.date && (
              <p id="date-error" role="alert" className="text-sm text-destructive">
                {errors.date.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || logActivity.isPending}>
              {t('tcu.dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
