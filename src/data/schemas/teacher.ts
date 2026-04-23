import { z } from 'zod'
import type { TFunction } from 'i18next'

export function buildTeacherSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .min(1, t('validation.required', { field: t('teachers.form.fields.firstName') }))
      .max(80),
    lastName: z
      .string()
      .min(1, t('validation.required', { field: t('teachers.form.fields.lastName') }))
      .max(80),
    email: z.string().email(t('validation.email')),
  })
}

export type TeacherFormValues = z.infer<ReturnType<typeof buildTeacherSchema>>
