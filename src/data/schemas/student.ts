import { z } from 'zod'
import type { TFunction } from 'i18next'

export function buildStudentSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.firstName') }))
      .max(80),
    lastName: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.lastName') }))
      .max(80),
    email: z.string().email(t('validation.email')),
    gender: z.enum(['F', 'M', 'X']),
    province: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.province') })),
    canton: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.canton') })),
    educationalLevel: z.enum(['Primary', 'Secondary', 'University']),
  })
}

export type StudentFormValues = z.infer<ReturnType<typeof buildStudentSchema>>
