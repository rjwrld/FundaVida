import { z } from 'zod'

export const studentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Invalid email'),
  gender: z.enum(['F', 'M', 'X']),
  province: z.string().min(1, 'Province is required'),
  canton: z.string().min(1, 'Canton is required'),
  educationalLevel: z.enum(['Primary', 'Secondary', 'University']),
})

export type StudentFormValues = z.infer<typeof studentSchema>
