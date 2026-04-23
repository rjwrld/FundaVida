import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildCourseSchema, type CourseFormValues } from '@/data/schemas/course'
import { useCourse, useCreateCourse, useUpdateCourse } from '@/hooks/api'
import { HEADQUARTERS, PROGRAMS } from '@/constants/course'
import { useStore } from '@/data/store'

export function CoursesFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useCourse(id ?? '')
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const teachers = useStore((s) => s.teachers)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(buildCourseSchema(t)),
    defaultValues: {
      name: '',
      description: '',
      headquartersName: '',
      programName: '',
      teacherId: '',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        description: existing.description,
        headquartersName: existing.headquartersName,
        programName: existing.programName,
        teacherId: existing.teacherId,
      })
    }
  }, [existing, reset])

  async function onSubmit(values: CourseFormValues) {
    if (isEdit && id) {
      await updateCourse.mutateAsync({ id, patch: values })
      navigate(`/app/courses/${id}`)
    } else {
      const created = await createCourse.mutateAsync(values)
      navigate(`/app/courses/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? t('courses.form.editTitle') : t('courses.form.newTitle')}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('courses.form.fields.name')}</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">{t('courses.form.fields.description')}</Label>
          <Textarea id="description" rows={3} {...register('description')} />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('courses.form.fields.headquartersName')}</Label>
            <Select
              value={watch('headquartersName')}
              onValueChange={(v) => setValue('headquartersName', v, { shouldValidate: true })}
            >
              <SelectTrigger aria-label={t('courses.form.fields.headquartersName')}>
                <SelectValue placeholder={t('courses.form.fields.headquartersName')} />
              </SelectTrigger>
              <SelectContent>
                {HEADQUARTERS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.headquartersName && (
              <p className="text-xs text-destructive">{errors.headquartersName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t('courses.form.fields.programName')}</Label>
            <Select
              value={watch('programName')}
              onValueChange={(v) => setValue('programName', v, { shouldValidate: true })}
            >
              <SelectTrigger aria-label={t('courses.form.fields.programName')}>
                <SelectValue placeholder={t('courses.form.fields.programName')} />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programName && (
              <p className="text-xs text-destructive">{errors.programName.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('courses.form.fields.teacherId')}</Label>
          <Select
            value={watch('teacherId')}
            onValueChange={(v) => setValue('teacherId', v, { shouldValidate: true })}
          >
            <SelectTrigger aria-label={t('courses.form.fields.teacherId')}>
              <SelectValue placeholder={t('courses.form.teacherPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.teacherId && (
            <p className="text-xs text-destructive">{errors.teacherId.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {t('common.actions.save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/courses')}>
            {t('common.actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
