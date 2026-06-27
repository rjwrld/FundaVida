import type { Program } from '@/types'

// The foundation's fixed catalog of eight programs (ADR-0015). A Program is the
// thing a Course is one cohort of. Names and descriptions are Spanish-only
// catalog content (CONTEXT.md) — they are never passed through t(). The catalog
// is frozen: programs are read-only in the app (no create/edit/delete), so this
// list is the single source the seed instantiates from.
export const PROGRAM_CATALOG: readonly Program[] = [
  {
    id: 'prog-1',
    name: 'Alfabetización',
    description: 'Refuerzo de lectura y escritura para estudiantes de primaria y secundaria.',
  },
  {
    id: 'prog-2',
    name: 'Matemáticas',
    description: 'Apoyo en razonamiento numérico y resolución de problemas según el nivel escolar.',
  },
  {
    id: 'prog-3',
    name: 'Inglés',
    description: 'Clases de inglés conversacional y gramática para abrir oportunidades futuras.',
  },
  {
    id: 'prog-4',
    name: 'Habilidades para la Vida',
    description:
      'Talleres de autoestima, comunicación y toma de decisiones para el bienestar integral.',
  },
  {
    id: 'prog-5',
    name: 'Computación',
    description:
      'Alfabetización digital: ofimática, navegación segura y pensamiento computacional.',
  },
  {
    id: 'prog-6',
    name: 'Arte y Cultura',
    description: 'Expresión creativa a través de las artes plásticas y la cultura costarricense.',
  },
  {
    id: 'prog-7',
    name: 'Música',
    description:
      'Formación musical en canto e instrumentos para fortalecer la disciplina y la confianza.',
  },
  {
    id: 'prog-8',
    name: 'Deporte y Recreación',
    description: 'Actividad física y juego cooperativo para promover hábitos saludables.',
  },
]
