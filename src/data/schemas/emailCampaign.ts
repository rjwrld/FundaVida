import { z } from 'zod'
import type { TFunction } from 'i18next'

export function buildEmailCampaignSchema(t: TFunction) {
  return z
    .object({
      subject: z
        .string()
        .min(3, t('validation.min', { count: 3 }))
        .max(120, t('validation.max', { count: 120 })),
      body: z
        .string()
        .min(10, t('validation.min', { count: 10 }))
        .max(4000, t('validation.max', { count: 4000 })),
      filterKind: z.enum(['all', 'program', 'province', 'course']),
      filterValue: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.filterKind !== 'all' && !values.filterValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['filterValue'],
          message: t('validation.selectValue'),
        })
      }
    })
}

export type EmailCampaignFormValues = z.infer<ReturnType<typeof buildEmailCampaignSchema>>
