import type { EducationalLevel, Gender } from '@/types'

export const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago'] as const

// Official Costa Rican cantones for each seeded Province. A Student's canton must
// belong to their province, so the seed and the Student form draw cantons from
// this map keyed by province (replacing the prior random global-city slop).
// Spanish proper nouns shown raw, like Province and Sede values — never t()'d.
export const CANTONS_BY_PROVINCE: Record<(typeof PROVINCES)[number], readonly string[]> = {
  'San José': [
    'San José',
    'Escazú',
    'Desamparados',
    'Puriscal',
    'Aserrí',
    'Mora',
    'Goicoechea',
    'Santa Ana',
    'Alajuelita',
    'Coronado',
    'Tibás',
    'Moravia',
    'Montes de Oca',
    'Curridabat',
    'Pérez Zeledón',
  ],
  Heredia: [
    'Heredia',
    'Barva',
    'Santo Domingo',
    'Santa Bárbara',
    'San Rafael',
    'San Isidro',
    'Belén',
    'Flores',
    'San Pablo',
    'Sarapiquí',
  ],
  Alajuela: [
    'Alajuela',
    'San Ramón',
    'Grecia',
    'Atenas',
    'Naranjo',
    'Palmares',
    'Poás',
    'Orotina',
    'San Carlos',
    'Zarcero',
    'Sarchí',
    'Upala',
  ],
  Cartago: [
    'Cartago',
    'Paraíso',
    'La Unión',
    'Jiménez',
    'Turrialba',
    'Alvarado',
    'Oreamuno',
    'El Guarco',
  ],
}
// The Spanish model tokens for a Student's schooling stage (CONTEXT.md). The UI
// renders them bilingually through t(); the source of truth for the type is the
// `EducationalLevel` union in the domain model.
export const EDUCATIONAL_LEVELS = [
  'primaria',
  'secundaria',
] as const satisfies readonly EducationalLevel[]
export const GENDERS: Gender[] = ['F', 'M', 'X']

export type Province = (typeof PROVINCES)[number]
