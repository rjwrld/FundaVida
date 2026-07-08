import type { QueryKey } from '@tanstack/react-query'
import type { StoreState } from '@/data/store'
import {
  PROGRAMS_KEY,
  STUDENTS_KEY,
  TEACHERS_KEY,
  COURSES_KEY,
  ENROLLMENTS_KEY,
  GRADES_KEY,
  CERTIFICATES_KEY,
  TRAINEES_KEY,
  TCU_KEY,
  ATTENDANCE_KEY,
  SESSION_EXCEPTIONS_KEY,
  ANNOUNCEMENTS_KEY,
  AUDIT_LOG_KEY,
  EMAIL_CAMPAIGNS_KEY,
} from './queryKeys'

/**
 * The store's data slices: the array-valued top-level fields. Everything else on
 * `StoreState` is either scalar metadata (`demoEpoch`, `offset`, `role`,
 * `currentUserId`, `locale`) or a mutation method, and neither is diffed for
 * invalidation. Deriving the union from `StoreState` keeps `SLICE_TO_KEYS` total:
 * adding a new array slice to the store is a compile error until it is mapped.
 */
export type StoreSliceName = {
  [K in keyof StoreState]: StoreState[K] extends unknown[] ? K : never
}[keyof StoreState]

/**
 * Maps each store slice to the query-key prefixes its writes invalidate — the one
 * audited place where cross-entity cache dependencies live (ADR-0029).
 *
 * Identity by default (a slice invalidates its own key). The exceptions:
 *  - `enrollments` also invalidates `['courses']`: seat counts and browse
 *    eligibility derive from enrollments, so a course's derived reads go stale
 *    when enrollments change without the `courses` slice itself changing.
 *  - `tcuActivities` maps to `['tcu']` (name mismatch) and also `['trainees']`,
 *    because trainee hour rollups derive from activities.
 *  - `tcuTrainees` maps to `['trainees']` (name mismatch).
 *  - `sessionExceptions` also invalidates `['courses']` and `['attendance']`: every
 *    Session surface (calendar, agenda, the Sessions section, close-readiness)
 *    composes `effectiveSessions` over the Course + attendance reads, so an
 *    exception write makes those derived reads stale without touching their own
 *    slices (ADR-0039, the #87 invalidation-completeness class).
 *
 * Only list-key prefixes appear here; React Query's default fuzzy matching then
 * covers every detail, scoped, and derived-child key (`['courses', id, role]`,
 * `['courses', 'seats', id]`, …) with no per-id entry.
 */
export const SLICE_TO_KEYS: Record<StoreSliceName, QueryKey[]> = {
  programs: [PROGRAMS_KEY],
  students: [STUDENTS_KEY],
  teachers: [TEACHERS_KEY],
  courses: [COURSES_KEY],
  enrollments: [ENROLLMENTS_KEY, COURSES_KEY],
  grades: [GRADES_KEY],
  certificates: [CERTIFICATES_KEY],
  tcuTrainees: [TRAINEES_KEY],
  tcuActivities: [TCU_KEY, TRAINEES_KEY],
  attendance: [ATTENDANCE_KEY],
  sessionExceptions: [SESSION_EXCEPTIONS_KEY, COURSES_KEY, ATTENDANCE_KEY],
  // Announcements are self-invalidating (identity). The CoursesDetailPage feed
  // reads under ['announcements'], as will the dashboard feed once ADR-0043 lands
  // — one prefix covers every such reader (the #87 completeness class). The
  // session-change auto-post writes this slice too, so a cancel/reschedule
  // refreshes the feed with no extra mapping (ADR-0040).
  announcements: [ANNOUNCEMENTS_KEY],
  auditLog: [AUDIT_LOG_KEY],
  emailCampaigns: [EMAIL_CAMPAIGNS_KEY],
}

/**
 * Derive the query keys to invalidate from a mutation's write-set: the top-level
 * store slices whose reference changed between `before` and `after`. Every store
 * mutation builds new arrays immutably, so reference inequality flags exactly the
 * written slices; `SLICE_TO_KEYS` maps each to its key prefixes. Pure and total —
 * this is the deep module `makeEntityMutation` wires to `invalidateQueries`.
 *
 * Because every `withAudit` mutation prepends to `auditLog`, that slice is always
 * in the diff and `['auditLog']` always invalidates — no special case needed.
 */
export function writeSetInvalidations(before: StoreState, after: StoreState): QueryKey[] {
  const keys: QueryKey[] = []
  const seen = new Set<string>()
  for (const slice of Object.keys(SLICE_TO_KEYS) as StoreSliceName[]) {
    if (before[slice] === after[slice]) continue
    for (const key of SLICE_TO_KEYS[slice]) {
      const id = JSON.stringify(key)
      if (seen.has(id)) continue
      seen.add(id)
      keys.push(key)
    }
  }
  return keys
}
