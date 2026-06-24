import { z } from 'zod'
import type { TFunction } from 'i18next'
import { SEDES } from '@/constants/sede'

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
    sede: z.enum(SEDES, {
      errorMap: () => ({
        message: t('validation.required', { field: t('teachers.form.fields.sede') }),
      }),
    }),
  })
}

export type TeacherFormValues = z.infer<ReturnType<typeof buildTeacherSchema>>
