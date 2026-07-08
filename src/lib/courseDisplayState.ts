import { isBefore, parseISO } from 'date-fns'
import type { Course } from '@/types'
import { isTermEnded } from './closeReadiness'

/**
 * The temporal state a viewer reads from a Course badge (ADR-0042) — derived,
 * never stored. It is a separate axis from the stored `CourseStatus` lifecycle
 * (draft/published/closed), which is people-driven (author → publish → close).
 * A published Course further splits by its Term dates against the clock seam
 * (ADR-0014):
 *
 * - `draft`      → the Teacher is still authoring (only authoring roles see it).
 * - `startsSoon` → published, Term not yet started.
 * - `inProgress` → published, inside the Term window.
 * - `termEnded`  → published, Term end has passed — exactly the close-readiness
 *                  worklist ({@link coursesToClose} / {@link isTermEnded}).
 * - `finished`   → closed (the cohort's certificates have been emitted).
 */
export type CourseDisplayState = 'draft' | 'startsSoon' | 'inProgress' | 'termEnded' | 'finished'

/**
 * Pure derivation of a Course's display state (ADR-0042). `now` is passed in so
 * this stays pure and testable; callers supply `clock.now()` (ADR-0014).
 *
 * The `termEnded` branch reuses {@link isTermEnded} — the same strict
 * `term.end < now` comparison `coursesToClose` uses — so a Course can never
 * badge "Term ended" while missing from the close worklist, or vice versa.
 */
export function courseDisplayState(course: Course, now: Date): CourseDisplayState {
  if (course.status === 'draft') return 'draft'
  if (course.status === 'closed') return 'finished'
  // published: split by the Term window.
  if (isTermEnded(course, now)) return 'termEnded'
  if (isBefore(now, parseISO(course.term.start))) return 'startsSoon'
  return 'inProgress'
}

/**
 * True when a Course accepts new enrollments (ADR-0042): only while it is
 * `startsSoon` or `inProgress`. Mid-Term joins are allowed (community-center
 * reality; attendance math tolerates missing early Sessions); a Term-ended,
 * draft, or closed Course is rejected. The store's enroll/request mutations
 * enforce this beside the one-Sede check (ADR-0011); the UI hides the request
 * button as defense-in-depth.
 */
export function isOpenForEnrollment(course: Course, now: Date): boolean {
  const state = courseDisplayState(course, now)
  return state === 'startsSoon' || state === 'inProgress'
}
