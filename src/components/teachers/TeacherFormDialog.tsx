import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildTeacherSchema, type TeacherFormValues } from '@/data/schemas/teacher'
import { useCreateTeacher, useTeacher, useUpdateTeacher } from '@/hooks/api'
import { SEDES } from '@/constants/sede'
import { CANTONS_BY_PROVINCE, PROVINCES } from '@/constants/student'

interface TeacherFormProps {
  teacherId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function TeacherForm({ teacherId, onSuccess, onCancel }: TeacherFormProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(teacherId)
  const { data: existing } = useTeacher(teacherId ?? '')
  const createTeacher = useCreateTeacher()
  const updateTeacher = useUpdateTeacher()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(buildTeacherSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      sede: '' as TeacherFormValues['sede'],
      province: '',
      canton: '',
    },
  })

  // Cantons offered depend on the chosen province (CANTONS_BY_PROVINCE).
  const selectedProvince = watch('province')
  const cantonOptions =
    selectedProvince in CANTONS_BY_PROVINCE
      ? CANTONS_BY_PROVINCE[selectedProvince as keyof typeof CANTONS_BY_PROVINCE]
      : []

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        sede: existing.sede,
        province: existing.province,
        canton: existing.canton,
      })
    }
  }, [existing, reset])

  async function onSubmit(values: TeacherFormValues) {
    if (isEdit && teacherId) {
      await updateTeacher.mutateAsync({ id: teacherId, patch: values })
    } else {
      await createTeacher.mutateAsync(values)
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('teachers.form.fields.firstName')}</Label>
          <Input
            id="firstName"
            aria-invalid={errors.firstName !== undefined}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p id="firstName-error" role="alert" className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('teachers.form.fields.lastName')}</Label>
          <Input
            id="lastName"
            aria-invalid={errors.lastName !== undefined}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p id="lastName-error" role="alert" className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email">{t('teachers.form.fields.email')}</Label>
          <Input
            id="email"
            type="email"
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t('teachers.form.fields.sede')}</Label>
          <Select
            value={watch('sede')}
            onValueChange={(v) =>
              setValue('sede', v as TeacherFormValues['sede'], { shouldValidate: true })
            }
          >
            <SelectTrigger
              aria-label={t('teachers.form.fields.sede')}
              aria-invalid={errors.sede !== undefined}
              aria-describedby={errors.sede ? 'sede-error' : undefined}
            >
              <SelectValue placeholder={t('teachers.form.fields.sede')} />
            </SelectTrigger>
            <SelectContent>
              {SEDES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sede && (
            <p id="sede-error" role="alert" className="text-sm text-destructive">
              {errors.sede.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t('teachers.form.fields.province')}</Label>
          <Select
            value={watch('province')}
            onValueChange={(v) => {
              if (!v || v === watch('province')) return
              setValue('province', v, { shouldValidate: true })
              setValue('canton', '', { shouldValidate: false })
            }}
          >
            <SelectTrigger
              aria-label={t('teachers.form.fields.province')}
              aria-invalid={errors.province !== undefined}
              aria-describedby={errors.province ? 'province-error' : undefined}
            >
              <SelectValue placeholder={t('teachers.form.fields.province')} />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.province && (
            <p id="province-error" role="alert" className="text-sm text-destructive">
              {errors.province.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t('teachers.form.fields.canton')}</Label>
          <Select
            value={watch('canton')}
            onValueChange={(v) => v && setValue('canton', v, { shouldValidate: true })}
            disabled={!selectedProvince}
          >
            <SelectTrigger
              aria-label={t('teachers.form.fields.canton')}
              aria-invalid={errors.canton !== undefined}
              aria-describedby={errors.canton ? 'canton-error' : undefined}
            >
              <SelectValue placeholder={t('teachers.form.fields.canton')} />
            </SelectTrigger>
            <SelectContent>
              {cantonOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.canton && (
            <p id="canton-error" role="alert" className="text-sm text-destructive">
              {errors.canton.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {t('common.actions.save')}
        </Button>
      </div>
    </form>
  )
}

interface TeacherFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  teacherId?: string
  onClose: () => void
}

export function TeacherFormDialog({ open, mode, teacherId, onClose }: TeacherFormDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('teachers.form.editTitle') : t('teachers.form.newTitle')}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <TeacherForm
            key={teacherId ?? 'new'}
            teacherId={teacherId}
            onSuccess={onClose}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
