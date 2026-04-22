export const HEADQUARTERS = ['San José HQ', 'Heredia HQ', 'Alajuela HQ'] as const
export const PROGRAMS = ['Literacy', 'Math', 'English', 'Life Skills'] as const

export type Headquarters = (typeof HEADQUARTERS)[number]
export type Program = (typeof PROGRAMS)[number]
