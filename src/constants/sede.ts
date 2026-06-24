// The foundation's three community centers. The model term is `sede` (the EN UI
// renders it "Campus", ES "Sede"); values are proper nouns shown raw, like
// Province values. One shared enum binds Course, Teacher, and Student (ADR-0011);
// adding a fourth sede is a one-line addition here plus a locale label.
export const SEDES = ['Linda Vista', 'Hatillo', 'Alajuelita'] as const

export type Sede = (typeof SEDES)[number]
