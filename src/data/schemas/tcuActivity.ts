import { z } from 'zod'
import type { TFunction } from 'i18next'

export interface TcuActivityFormValues {
  title: string
  hours: number
  date: string
  traineeId?: string
}

export function buildTcuActivitySchema(t: TFunction) {
  return z.object({
    title: z
      .string()
      .min(1, t('validation.required', { field: t('tcu.form.titleLabel') }))
      .max(255, t('validation.max', { count: 255 })),
    hours: z
      .number()
      .int()
      .min(1, t('validation.numberMin', { min: 1 }))
      .max(100, t('validation.numberMax', { max: 100 })),
    date: z.string().min(1, t('validation.required', { field: t('tcu.form.dateLabel') })),
    traineeId: z.string().optional(),
  })
}
