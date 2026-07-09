import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { COURSE_LEVELS, COURSE_STATUSES } from '@/constants/course'
import { SEDES } from '@/constants/sede'
import { WEEKDAYS, type Weekday } from '@/types/domain'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'

interface CourseFormProps {
  courseId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function CourseForm({ courseId, onSuccess, onCancel }: CourseFormProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(courseId)
  const { data: existing } = useCourse(courseId ?? '')
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const teachers = useStore((s) => s.teachers)
  const programs = useStore((s) => s.programs)
  const role = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)
  const currentTeacher = teachers.find((t) => t.id === currentUserId)
  const isTeacher = role === 'teacher'

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
      sede: '' as CourseFormValues['sede'],
      programId: '',
      level: '' as CourseFormValues['level'],
      status: 'draft',
      capacity: 20,
      teacherId: '',
      termStart: '',
      termEnd: '',
      meetingDays: [],
    },
  })

  useEffect(() => {
    if (existing) {
      const termStartDate = new Date(existing.term.start)
      const termEndDate = new Date(existing.term.end)
      reset({
        name: existing.name,
        description: existing.description,
        sede: existing.sede,
        programId: existing.programId,
        level: existing.level,
        // The authoring form only handles draft/published; a 'closed' cohort is
        // terminal and its Edit entry points are gated off (ADR-0024), so this
        // fallback is defensive — closed never actually reaches the form.
        status: existing.status === 'closed' ? 'published' : existing.status,
        capacity: existing.capacity,
        teacherId: existing.teacherId,
        termStart: format(termStartDate, 'yyyy-MM-dd'),
        termEnd: format(termEndDate, 'yyyy-MM-dd'),
        meetingDays: existing.meetingDays,
      })
    } else if (isTeacher && currentTeacher && !isEdit) {
      // Pre-fill teacher's Sede and self for create (ADR-0016)
      reset({
        name: '',
        description: '',
        sede: currentTeacher.sede,
        programId: '',
        level: '' as CourseFormValues['level'],
        status: 'draft',
        capacity: 20,
        teacherId: currentTeacher.id,
        termStart: '',
        termEnd: '',
        meetingDays: [],
      })
    }
  }, [existing, reset, isTeacher, currentTeacher, isEdit])

  async function onSubmit(values: CourseFormValues) {
    const termStart = parseISO(values.termStart).toISOString()
    const termEnd = parseISO(values.termEnd).toISOString()

    const courseData = {
      ...values,
      term: { start: termStart, end: termEnd },
      meetingDays: values.meetingDays,
    }

    // Remove form-specific fields
    const { termStart: _, termEnd: __, ...dataToSubmit } = courseData

    if (isEdit && courseId) {
      await updateCourse.mutateAsync({ id: courseId, patch: dataToSubmit })
    } else {
      await createCourse.mutateAsync(dataToSubmit)
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t('courses.form.fields.name')}</Label>
        <Input
          id="name"
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t('courses.form.fields.description')}</Label>
        <Textarea
          id="description"
          rows={3}
          aria-invalid={errors.description !== undefined}
          aria-describedby={errors.description ? 'description-error' : undefined}
          {...register('description')}
        />
        {errors.description && (
          <p id="description-error" role="alert" className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sede">{t('courses.form.fields.sede')}</Label>
          {isTeacher ? (
            <div
              className="rounded border border-input bg-muted px-3 py-2 text-sm"
              data-testid="sede-locked"
            >
              {watch('sede')}
            </div>
          ) : (
            <Select
              value={watch('sede')}
              onValueChange={(v) => {
                setValue('sede', v as CourseFormValues['sede'], { shouldValidate: true })
                // A Teacher belongs to one Sede (ADR-0011); changing the Course Sede
                // invalidates any Teacher already chosen for the old one.
                setValue('teacherId', '', { shouldValidate: false })
              }}
            >
              <SelectTrigger
                id="sede"
                aria-invalid={errors.sede !== undefined}
                aria-describedby={errors.sede ? 'sede-error' : undefined}
              >
                <SelectValue placeholder={t('courses.form.fields.sede')} />
              </SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.sede && (
            <p id="sede-error" role="alert" className="text-xs text-destructive">
              {errors.sede.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="programId">{t('courses.form.fields.programId')}</Label>
          <Select
            value={watch('programId')}
            onValueChange={(v) => setValue('programId', v, { shouldValidate: true })}
          >
            <SelectTrigger
              id="programId"
              aria-invalid={errors.programId !== undefined}
              aria-describedby={errors.programId ? 'programId-error' : undefined}
            >
              <SelectValue placeholder={t('courses.form.fields.programId')} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.programId && (
            <p id="programId-error" role="alert" className="text-xs text-destructive">
              {errors.programId.message}
            </p>
          )}
        </div>
      </div>
      <div className={`grid gap-4 ${isTeacher && !isEdit ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        <div className="space-y-1.5">
          <Label htmlFor="level">{t('courses.form.fields.level')}</Label>
          <Select
            value={watch('level')}
            onValueChange={(v) =>
              setValue('level', v as CourseFormValues['level'], { shouldValidate: true })
            }
          >
            <SelectTrigger
              id="level"
              aria-invalid={errors.level !== undefined}
              aria-describedby={errors.level ? 'level-error' : undefined}
            >
              <SelectValue placeholder={t('courses.form.fields.level')} />
            </SelectTrigger>
            <SelectContent>
              {COURSE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {t(`courses.level.${l}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.level && (
            <p id="level-error" role="alert" className="text-xs text-destructive">
              {errors.level.message}
            </p>
          )}
        </div>
        {!isTeacher || isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="status">{t('courses.form.fields.status')}</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) =>
                setValue('status', v as CourseFormValues['status'], { shouldValidate: true })
              }
            >
              <SelectTrigger
                id="status"
                aria-invalid={errors.status !== undefined}
                aria-describedby={errors.status ? 'status-error' : undefined}
              >
                <SelectValue placeholder={t('courses.form.fields.status')} />
              </SelectTrigger>
              <SelectContent>
                {COURSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`courses.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p id="status-error" role="alert" className="text-xs text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="capacity">{t('courses.form.fields.capacity')}</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            aria-invalid={errors.capacity !== undefined}
            aria-describedby={errors.capacity ? 'capacity-error' : undefined}
            {...register('capacity')}
          />
          {errors.capacity && (
            <p id="capacity-error" role="alert" className="text-xs text-destructive">
              {errors.capacity.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teacherId">{t('courses.form.fields.teacherId')}</Label>
        {isTeacher && !isEdit ? (
          <div
            className="rounded border border-input bg-muted px-3 py-2 text-sm"
            data-testid="teacher-locked"
          >
            {currentTeacher && fullName(currentTeacher)}
          </div>
        ) : (
          <Select
            // The teacher options are filtered by the selected Sede, so on an edit
            // they are empty at first mount and only appear once the async course
            // load resets `sede`. Keying the Select to the Sede remounts it then, so
            // Radix registers the items with the current `teacherId` and resolves the
            // selected label instead of sticking on the placeholder.
            key={`teacher-${watch('sede')}`}
            value={watch('teacherId')}
            onValueChange={(v) => setValue('teacherId', v, { shouldValidate: true })}
          >
            <SelectTrigger
              id="teacherId"
              aria-invalid={errors.teacherId !== undefined}
              aria-describedby={errors.teacherId ? 'teacherId-error' : undefined}
            >
              <SelectValue placeholder={t('courses.form.teacherPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {teachers
                .filter((teacher) => teacher.sede === watch('sede'))
                .map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {fullName(teacher)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {errors.teacherId && (
          <p id="teacherId-error" role="alert" className="text-xs text-destructive">
            {errors.teacherId.message}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="termStart">{t('courses.form.fields.termStart')}</Label>
          <Input
            id="termStart"
            type="date"
            aria-invalid={errors.termStart !== undefined}
            aria-describedby={errors.termStart ? 'termStart-error' : undefined}
            {...register('termStart')}
          />
          {errors.termStart && (
            <p id="termStart-error" role="alert" className="text-xs text-destructive">
              {errors.termStart.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="termEnd">{t('courses.form.fields.termEnd')}</Label>
          <Input
            id="termEnd"
            type="date"
            aria-invalid={errors.termEnd !== undefined}
            aria-describedby={errors.termEnd ? 'termEnd-error' : undefined}
            {...register('termEnd')}
          />
          {errors.termEnd && (
            <p id="termEnd-error" role="alert" className="text-xs text-destructive">
              {errors.termEnd.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label id="meetingDays-label">{t('courses.form.fields.meetingDays')}</Label>
        <div
          role="group"
          aria-labelledby="meetingDays-label"
          aria-describedby={errors.meetingDays ? 'meetingDays-error' : undefined}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {WEEKDAYS.map((day) => {
            const dayLabels: Record<Weekday, string> = {
              mon: t('courses.form.weekdays.mon'),
              tue: t('courses.form.weekdays.tue'),
              wed: t('courses.form.weekdays.wed'),
              thu: t('courses.form.weekdays.thu'),
              fri: t('courses.form.weekdays.fri'),
              sat: t('courses.form.weekdays.sat'),
              sun: t('courses.form.weekdays.sun'),
            }
            return (
              <Checkbox
                key={day}
                value={day}
                label={dayLabels[day]}
                checked={watch('meetingDays').includes(day)}
                onChange={(e) => {
                  const checked = e.currentTarget.checked
                  const current = watch('meetingDays')
                  if (checked) {
                    setValue('meetingDays', [...current, day], { shouldValidate: true })
                  } else {
                    setValue(
                      'meetingDays',
                      current.filter((d) => d !== day),
                      { shouldValidate: true }
                    )
                  }
                }}
              />
            )
          })}
        </div>
        {errors.meetingDays && (
          <p id="meetingDays-error" role="alert" className="text-xs text-destructive">
            {errors.meetingDays.message}
          </p>
        )}
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

interface CourseFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  courseId?: string
  onClose: () => void
}

export function CourseFormDialog({ open, mode, courseId, onClose }: CourseFormDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('courses.form.editTitle') : t('courses.form.newTitle')}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <CourseForm
            key={courseId ?? 'new'}
            courseId={courseId}
            onSuccess={onClose}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
