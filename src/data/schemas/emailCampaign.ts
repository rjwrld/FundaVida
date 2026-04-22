import { z } from 'zod'

export const emailCampaignSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(120),
  body: z.string().min(10, 'Body must be at least 10 characters').max(4000),
  filterKind: z.enum(['all', 'program', 'province', 'course']),
  filterValue: z.string().optional(),
})

export type EmailCampaignFormValues = z.infer<typeof emailCampaignSchema>
