import { z } from 'zod'

export const courseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().min(1, 'Description is required').max(500),
  headquartersName: z.string().min(1, 'Headquarters is required'),
  programName: z.string().min(1, 'Program is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
})

export type CourseFormValues = z.infer<typeof courseSchema>
