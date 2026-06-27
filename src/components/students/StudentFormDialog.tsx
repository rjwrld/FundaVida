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
import { buildStudentSchema, type StudentFormValues } from '@/data/schemas/student'
import { useCreateStudent, useStudent, useUpdateStudent } from '@/hooks/api'
import { EDUCATIONAL_LEVELS, GENDERS, PROVINCES } from '@/constants/student'
import { SEDES } from '@/constants/sede'

interface StudentFormProps {
  studentId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function StudentForm({ studentId, onSuccess, onCancel }: StudentFormProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(studentId)
  const { data: existing } = useStudent(studentId ?? '')
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(buildStudentSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      gender: 'F',
      sede: '' as StudentFormValues['sede'],
      province: '',
      canton: '',
      educationalLevel: 'primaria',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        gender: existing.gender,
        sede: existing.sede,
        province: existing.province,
        canton: existing.canton,
        educationalLevel: existing.educationalLevel as StudentFormValues['educationalLevel'],
      })
    }
  }, [existing, reset])

  async function onSubmit(values: StudentFormValues) {
    if (isEdit && studentId) {
      await updateStudent.mutateAsync({ id: studentId, patch: values })
    } else {
      await createStudent.mutateAsync(values)
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('students.form.fields.firstName')}</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('students.form.fields.lastName')}</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t('students.form.fields.email')}</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t('students.form.fields.gender')}</Label>
          <Select
            value={watch('gender')}
            onValueChange={(v) =>
              setValue('gender', v as StudentFormValues['gender'], { shouldValidate: true })
            }
          >
            <SelectTrigger aria-label={t('students.form.fields.gender')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {t(`students.form.gender.${g}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('students.form.fields.province')}</Label>
          <Select
            value={watch('province')}
            onValueChange={(v) => setValue('province', v, { shouldValidate: true })}
          >
            <SelectTrigger aria-label={t('students.form.fields.province')}>
              <SelectValue placeholder={t('students.form.fields.province')} />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.province && <p className="text-xs text-destructive">{errors.province.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="canton">{t('students.form.fields.canton')}</Label>
          <Input id="canton" {...register('canton')} />
          {errors.canton && <p className="text-xs text-destructive">{errors.canton.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('students.form.fields.sede')}</Label>
          <Select
            value={watch('sede')}
            onValueChange={(v) =>
              setValue('sede', v as StudentFormValues['sede'], { shouldValidate: true })
            }
          >
            <SelectTrigger aria-label={t('students.form.fields.sede')}>
              <SelectValue placeholder={t('students.form.fields.sede')} />
            </SelectTrigger>
            <SelectContent>
              {SEDES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sede && <p className="text-xs text-destructive">{errors.sede.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t('students.form.fields.educationalLevel')}</Label>
          <Select
            value={watch('educationalLevel')}
            onValueChange={(v) =>
              setValue('educationalLevel', v as StudentFormValues['educationalLevel'], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger aria-label={t('students.form.fields.educationalLevel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDUCATIONAL_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {t(`students.form.level.${l}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

interface StudentFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  studentId?: string
  onClose: () => void
}

export function StudentFormDialog({ open, mode, studentId, onClose }: StudentFormDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('students.form.editTitle') : t('students.form.newTitle')}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <StudentForm
            key={studentId ?? 'new'}
            studentId={studentId}
            onSuccess={onClose}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
