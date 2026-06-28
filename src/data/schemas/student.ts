import { z } from 'zod'
import type { TFunction } from 'i18next'
import { SEDES } from '@/constants/sede'
import { EDUCATIONAL_LEVELS, GUARDIAN_RELATIONSHIPS } from '@/constants/student'

// A Costa Rican mobile number, formatted "8888-8888" (8 digits, leading 6/7/8).
const CR_PHONE = /^[678]\d{3}-\d{4}$/

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
    // The encargado (guardian) — every Student is a minor, so it's required.
    guardian: z.object({
      name: z
        .string()
        .min(1, t('validation.required', { field: t('students.form.fields.guardianName') }))
        .max(80),
      relationship: z.enum(GUARDIAN_RELATIONSHIPS),
      phone: z.string().regex(CR_PHONE, t('validation.phone')),
      email: z.string().email(t('validation.email')),
    }),
  })
}

export type StudentFormValues = z.infer<ReturnType<typeof buildStudentSchema>>
