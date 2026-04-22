import { z } from 'zod'

export const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Invalid email'),
})

export type TeacherFormValues = z.infer<typeof teacherSchema>
