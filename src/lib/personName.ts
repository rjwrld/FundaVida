import type { Student, Teacher, TcuTrainee } from '@/types'

/** The `{ firstName, lastName }` pair every person in the domain carries —
 * `Student`, `Teacher` and `TcuTrainee` alike. `fullName` is keyed on the pair
 * rather than on any one entity so a roster that mixes them reads the same. */
export type PersonName = Pick<Student | Teacher | TcuTrainee, 'firstName' | 'lastName'>

/**
 * How this app writes a person's name: the given name, then the first surname,
 * separated by one space. Costa Ricans carry two surnames; the domain stores
 * and shows only the first (`lastName`), so this is the whole rule.
 *
 * Every surface goes through here, not just the ones that render — a name is
 * also a sort key (the Students table), a search haystack (`api/students.ts`)
 * and an audit-log summary (`store.ts`). Those three must agree with what the
 * page paints, or a roster sorts by a name nobody can see. Changing the format
 * is then this one edit.
 *
 * Resolving an id to a person is deliberately *not* this module's job. The four
 * call sites that do it disagree about the missing-person fallback — the raw id
 * (`CoursesListPage`), `null` (`Breadcrumbs`), a localized "unassigned"
 * (`CoursesDetailPage`), the raw sender (`emailRecipients`, since a campaign
 * outlives its Teacher) — and each disagreement is deliberate. They keep their
 * own `find` and pass the person here.
 */
export function fullName(person: PersonName): string {
  return `${person.firstName} ${person.lastName}`
}
