import { z } from 'zod'
import type { TFunction } from 'i18next'
import { SEDES } from '@/constants/sede'
import { EDUCATIONAL_LEVELS } from '@/constants/student'

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
    sede: z.enum(SEDES, {
      errorMap: () => ({
        message: t('validation.required', { field: t('students.form.fields.sede') }),
      }),
    }),
    province: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.province') })),
    canton: z
      .string()
      .min(1, t('validation.required', { field: t('students.form.fields.canton') })),
    educationalLevel: z.enum(EDUCATIONAL_LEVELS),
  })
}

export type StudentFormValues = z.infer<ReturnType<typeof buildStudentSchema>>
