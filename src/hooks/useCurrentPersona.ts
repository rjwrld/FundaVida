import { useStore } from '@/data/store'
import type { Role, Student, Teacher, TcuTrainee } from '@/types'

/**
 * The person behind the signed-in persona. `Teacher`, `Student` and `TcuTrainee` are the
 * three records the demo signs in as; they share the `{ firstName, lastName }` pair
 * `lib/personName` keys on, which is what display surfaces want from them.
 */
export type Persona = Teacher | Student | TcuTrainee

export interface CurrentPersona {
  /** The id the app acts as: permission checks, audit `actorId`, scoped reads. */
  id: string
  role: Role
  /**
   * Undefined for admin, and only for admin: the role is a seat rather than someone in the
   * seeded graph. A caller that needs a name must have a fallback for it (the sidebar footer
   * shows the role label), not treat the persona as absent.
   */
  person?: Persona
}

/**
 * Resolves the store's `role` + `currentUserId` to the person record behind them — the one
 * place that walks the three rosters, so a surface can render "who am I" without deciding
 * for itself which roster to look in. Callers that only need the *id* (a `can()` check, a
 * scope context) should keep reading `currentUserId` straight from the store; this hook is
 * for the surfaces that need the person.
 *
 * Its predecessor (`useCurrentUser`) modelled this as optional `teacher`/`student` fields
 * and had no `tcu` branch at all, so a TCU trainee resolved to a signed-in user with no
 * name. It had no callers to break, so it is replaced rather than extended.
 */
export function useCurrentPersona(): CurrentPersona | null {
  const role = useStore((s) => s.role)
  const id = useStore((s) => s.currentUserId)
  // One selector, three rosters: an id belongs to at most one of them, and returning the
  // found record (never a fresh object) keeps the zustand subscription from re-rendering
  // on every unrelated store write.
  const person = useStore((s) =>
    id
      ? (s.teachers.find((p) => p.id === id) ??
        s.students.find((p) => p.id === id) ??
        s.tcuTrainees.find((p) => p.id === id))
      : undefined
  )

  if (!role || !id) return null
  return { id, role, person }
}
