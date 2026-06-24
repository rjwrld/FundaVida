export const PROGRAMS = ['Literacy', 'Math', 'English', 'Life Skills'] as const

export type Program = (typeof PROGRAMS)[number]
