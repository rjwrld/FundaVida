import { z } from 'zod'

export const gradeSchema = z.object({
  score: z
    .number({ invalid_type_error: 'Score must be a number' })
    .min(0, 'Min 0')
    .max(100, 'Max 100'),
})

export type GradeFormValues = z.infer<typeof gradeSchema>
