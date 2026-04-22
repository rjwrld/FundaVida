import type { Gender } from '@/types'

export const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago'] as const
export const EDUCATIONAL_LEVELS = ['Primary', 'Secondary', 'University'] as const
export const GENDERS: Gender[] = ['F', 'M', 'X']

export type EducationalLevel = (typeof EDUCATIONAL_LEVELS)[number]
export type Province = (typeof PROVINCES)[number]
