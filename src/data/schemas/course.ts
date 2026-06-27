import { z } from 'zod'
import type { TFunction } from 'i18next'
import { parseISO } from 'date-fns'
import { WEEKDAYS } from '@/types/domain'
import { SEDES } from '@/constants/sede'
import { COURSE_LEVELS, COURSE_STATUSES } from '@/constants/course'

export function buildCourseSchema(t: TFunction) {
  return z
    .object({
      name: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.name') }))
        .max(120),
      description: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.description') }))
        .max(500),
      sede: z.enum(SEDES, {
        errorMap: () => ({
          message: t('validation.required', { field: t('courses.form.fields.sede') }),
        }),
      }),
      programId: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.programId') })),
      level: z.enum(COURSE_LEVELS, {
        errorMap: () => ({
          message: t('validation.required', { field: t('courses.form.fields.level') }),
        }),
      }),
      status: z.enum(COURSE_STATUSES, {
        errorMap: () => ({
          message: t('validation.required', { field: t('courses.form.fields.status') }),
        }),
      }),
      capacity: z.coerce
        .number({ invalid_type_error: t('validation.numberRequired') })
        .int(t('validation.numberRequired'))
        .min(1, t('validation.numberMin', { min: 1 })),
      teacherId: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.teacherId') })),
      termStart: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.termStart') })),
      termEnd: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.termEnd') })),
      meetingDays: z.array(z.enum(WEEKDAYS)).min(1, t('validation.meetingDaysRequired')),
    })
    .refine(
      (data) => {
        const start = parseISO(data.termStart)
        const end = parseISO(data.termEnd)
        return start <= end
      },
      {
        message: t('validation.termEndAfterStart'),
        path: ['termEnd'],
      }
    )
}

export type CourseFormValues = z.infer<ReturnType<typeof buildCourseSchema>>
