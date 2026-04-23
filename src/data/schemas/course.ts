import { z } from 'zod'
import type { TFunction } from 'i18next'

export function buildCourseSchema(t: TFunction) {
  return z.object({
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
  })
}

export type CourseFormValues = z.infer<ReturnType<typeof buildCourseSchema>>
