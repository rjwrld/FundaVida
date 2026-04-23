import { z } from 'zod'
import type { TFunction } from 'i18next'

export function buildGradeSchema(t: TFunction) {
  return z.object({
    score: z
      .number({ invalid_type_error: t('validation.numberRequired') })
      .min(0, t('validation.numberMin', { min: 0 }))
      .max(100, t('validation.numberMax', { max: 100 })),
  })
}

export type GradeFormValues = z.infer<ReturnType<typeof buildGradeSchema>>
