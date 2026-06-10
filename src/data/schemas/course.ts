import { z } from 'zod'
import type { TFunction } from 'i18next'
import { parseISO } from 'date-fns'
import { WEEKDAYS } from '@/types/domain'

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
      headquartersName: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.headquartersName') })),
      programName: z
        .string()
        .min(1, t('validation.required', { field: t('courses.form.fields.programName') })),
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
