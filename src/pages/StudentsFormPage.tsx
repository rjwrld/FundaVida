import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { buildStudentSchema, type StudentFormValues } from '@/data/schemas/student'
import { useCreateStudent, useStudent, useUpdateStudent } from '@/hooks/api'
import { EDUCATIONAL_LEVELS, GENDERS, PROVINCES } from '@/constants/student'

export function StudentsFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useStudent(id ?? '')
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
      province: '',
      canton: '',
      educationalLevel: 'Primary',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        gender: existing.gender,
        province: existing.province,
        canton: existing.canton,
        educationalLevel: existing.educationalLevel as StudentFormValues['educationalLevel'],
      })
    }
  }, [existing, reset])

  async function onSubmit(values: StudentFormValues) {
    if (isEdit && id) {
      await updateStudent.mutateAsync({ id, patch: values })
      navigate(`/app/students/${id}`)
    } else {
      const created = await createStudent.mutateAsync(values)
      navigate(`/app/students/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={isEdit ? t('students.form.editTitle') : t('students.form.newTitle')} />
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
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
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
            {errors.province && (
              <p className="text-xs text-destructive">{errors.province.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canton">{t('students.form.fields.canton')}</Label>
            <Input id="canton" {...register('canton')} />
            {errors.canton && <p className="text-xs text-destructive">{errors.canton.message}</p>}
          </div>
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
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {t('common.actions.save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/students')}>
            {t('common.actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
