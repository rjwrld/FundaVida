import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildTeacherSchema, type TeacherFormValues } from '@/data/schemas/teacher'
import { useCreateTeacher, useTeacher, useUpdateTeacher } from '@/hooks/api'

export function TeachersFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useTeacher(id ?? '')
  const createTeacher = useCreateTeacher()
  const updateTeacher = useUpdateTeacher()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(buildTeacherSchema(t)),
    defaultValues: { firstName: '', lastName: '', email: '' },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
      })
    }
  }, [existing, reset])

  async function onSubmit(values: TeacherFormValues) {
    if (isEdit && id) {
      await updateTeacher.mutateAsync({ id, patch: values })
      navigate(`/app/teachers/${id}`)
    } else {
      const created = await createTeacher.mutateAsync(values)
      navigate(`/app/teachers/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? t('teachers.form.editTitle') : t('teachers.form.newTitle')}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('teachers.form.fields.firstName')}</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('teachers.form.fields.lastName')}</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">{t('teachers.form.fields.email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {t('common.actions.save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/teachers')}>
            {t('common.actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
