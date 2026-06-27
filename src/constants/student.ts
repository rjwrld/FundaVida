import type { EducationalLevel, Gender } from '@/types'

export const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago'] as const
// The Spanish model tokens for a Student's schooling stage (CONTEXT.md). The UI
// renders them bilingually through t(); the source of truth for the type is the
// `EducationalLevel` union in the domain model.
export const EDUCATIONAL_LEVELS = [
  'primaria',
  'secundaria',
] as const satisfies readonly EducationalLevel[]
export const GENDERS: Gender[] = ['F', 'M', 'X']

export type Province = (typeof PROVINCES)[number]
