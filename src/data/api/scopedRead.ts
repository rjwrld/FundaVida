import { scopeFor, type Resource, type Scope } from '@/permissions'
import { useStore, type StoreState } from '../store'
import { applyScope, type ScopeFilters } from './scope'
import { delay } from './_delay'

/**
 * The four-line scoped-read pipeline (ADR-0031), once. Every entity's `list`/`get`
 * was the same shape — `delay()`, read a store slice, take the scope token from
 * `scopeFor(role)[resource]`, `applyScope`, `applyFilters` — differing only in the
 * slice, the resource string, the item type, and the entity-local predicate. That
 * variation now lives as data in RESOURCE_READ (below) and as the caller's
 * `applyFilters` argument; here the pipeline exists exactly once.
 */

/** The item type of a scoped resource, reusing applyScope's filter map (ADR-0031). */
type ItemFor<R extends keyof ScopeFilters> = ScopeFilters[R][number]

/**
 * The store slices whose element type is exactly `ItemFor<R>`. The bidirectional
 * `extends` pins the match in both directions, so an incoherent triple in
 * RESOURCE_READ (e.g. `trainees` pointing at the `courses` slice) is a compile
 * error rather than a silent empty roster.
 */
type SliceKeyFor<R extends keyof ScopeFilters> = {
  [K in keyof StoreState]: StoreState[K] extends ScopeFilters[R]
    ? ScopeFilters[R] extends StoreState[K]
      ? K
      : never
    : never
}[keyof StoreState]

/**
 * The three read axes per resource: the scope-token key (into `scopeFor`) and the
 * store slice; the applyScope resource is the row key itself. They coincide for
 * most entities and genuinely diverge for three (ADR-0031, ADR-0013):
 *   - `trainees` rides the `tcu` token and its own `tcuTrainees` slice,
 *   - `emailCampaigns` rides the `bulkEmail` token,
 *   - `tcu` reads the `tcuActivities` slice.
 * These are stable facts about each entity, not per-call variation, so they sit
 * here as one reviewable, `satisfies`-checked table — the subtle deviations that
 * are easy to "helpfully fix" and break live in one place, not scattered across
 * twelve files.
 */
const RESOURCE_READ = {
  programs: { scopeKey: 'programs', slice: 'programs' },
  students: { scopeKey: 'students', slice: 'students' },
  teachers: { scopeKey: 'teachers', slice: 'teachers' },
  courses: { scopeKey: 'courses', slice: 'courses' },
  enrollments: { scopeKey: 'enrollments', slice: 'enrollments' },
  grades: { scopeKey: 'grades', slice: 'grades' },
  certificates: { scopeKey: 'certificates', slice: 'certificates' },
  attendance: { scopeKey: 'attendance', slice: 'attendance' },
  auditLog: { scopeKey: 'auditLog', slice: 'auditLog' },
  emailCampaigns: { scopeKey: 'bulkEmail', slice: 'emailCampaigns' },
  tcu: { scopeKey: 'tcu', slice: 'tcuActivities' },
  trainees: { scopeKey: 'tcu', slice: 'tcuTrainees' },
  // Session exceptions ride the Courses scope token (ADR-0039): visibility is
  // "the exceptions of the Courses you can see", not a new permission resource.
  sessionExceptions: { scopeKey: 'courses', slice: 'sessionExceptions' },
  // Announcements are a real permission resource (create/delete, ADR-0040), so
  // they carry their own scope token — but that token mirrors the Courses one per
  // role and applyScope routes it through applyCoursesScope, so the feed audience
  // is always exactly the Course's audience.
  announcements: { scopeKey: 'announcements', slice: 'announcements' },
} satisfies { [R in keyof ScopeFilters]: { scopeKey: Resource; slice: SliceKeyFor<R> } }

/**
 * Read a scoped list: apply the current role's scope token to the resource's store
 * slice, then the caller's `applyFilters` (entity-local knowledge stays with the
 * entity). `scopeOverride` bypasses the role's token for the per-request browse
 * path (courses only, `useBrowseableCourse`), orthogonal to the fixed triple.
 */
export async function scopedList<R extends keyof ScopeFilters, F>(
  resource: R,
  filters: F,
  applyFilters?: (items: ScopeFilters[R], filters: F) => ScopeFilters[R],
  scopeOverride?: Scope
): Promise<ScopeFilters[R]> {
  await delay()
  const state = useStore.getState()
  const role = state.role ?? 'student'
  const { scopeKey, slice } = RESOURCE_READ[resource]
  const scope = scopeOverride ?? scopeFor(role)[scopeKey]
  const items = state[slice] as ScopeFilters[R]
  const scoped = applyScope(resource, scope, items, state)
  return applyFilters ? applyFilters(scoped, filters) : scoped
}

/**
 * Read a single scoped record by id — the same scoped list, then a find. A record
 * outside the caller's scope is indistinguishable from a missing one (both null),
 * so `get` never leaks existence beyond what `list` would show.
 */
export async function scopedGet<R extends keyof ScopeFilters>(
  resource: R,
  id: string,
  scopeOverride?: Scope
): Promise<ItemFor<R> | null> {
  const items = await scopedList(resource, {}, undefined, scopeOverride)
  return items.find((item) => item.id === id) ?? null
}
