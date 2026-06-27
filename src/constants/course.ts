import type { CourseLevel, CourseStatus } from '@/types'

// The schooling stage a Course targets and its publication state (ADR-0016).
// Both are bilingual enums rendered through t() (unlike the Spanish-only Program
// names); these arrays drive the Course form's pickers and zod validation.
export const COURSE_LEVELS = [
  'primaria',
  'secundaria',
  'both',
] as const satisfies readonly CourseLevel[]
export const COURSE_STATUSES = ['draft', 'published'] as const satisfies readonly CourseStatus[]
