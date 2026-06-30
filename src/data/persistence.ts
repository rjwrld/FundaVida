import type { SeedSnapshot } from './seed'
import { WEEKDAYS, type Role, type Weekday } from '@/types'
import { SEDES, type Sede } from '@/constants/sede'
import { COURSE_LEVELS, COURSE_STATUSES } from '@/constants/course'

const STATE_KEY = 'fundavida:v10:state'
const ROLE_KEY = 'fundavida:v2:role'

// Stale pre-v4 snapshot keys this layer owns. They are not migrated (ADR-0003,
// ADR-0014): they are removed on first load so the app reseeds cleanly at a
// fresh Demo Epoch instead of rehydrating an incoherent older world. The v3
// state snapshot predates the Program entity and the new Course/Enrollment/TCU
// fields (ADR-0015/0016/0017). The v10 key bump reworks the Certificate model
// (ADR-0024): emitted on course-close, no pending/approved status, `createdAt →
// issuedAt` — so a v9 cert's shape no longer validates. It sits on top of v9's
// Spanish TCU service-activity titles (catalog data rendered raw, never via
// t()), on top of v8's level-neutral Program descriptions (so a single-level Course never
// contradicts its blurb), v7's single-level Courses (ADR-0020) + human names
// (ADR-0021), v6's Student
// encargado (guardian) and teacher province/canton, v5's Costa Rican names,
// `@fundavida.es` emails, and province-coherent cantons — so every prior
// snapshot (incl. v7) is stale and joins this list. Only keys this module owns
// are listed — UI preferences such as
// theme and banner-dismissed belong to other modules and must survive a reseed,
// so they are deliberately left untouched. The v2 role, current-user, and locale
// keys are unchanged by this slice and stay in use.
const LEGACY_SNAPSHOT_KEYS = [
  'fundavida:v1:state',
  'fundavida:v1:role',
  'fundavida:v1:current-user',
  'fundavida:v1:locale',
  'fundavida:v2:state',
  'fundavida:v3:state',
  'fundavida:v4:state',
  'fundavida:v5:state',
  'fundavida:v6:state',
  'fundavida:v7:state',
  'fundavida:v8:state',
  'fundavida:v9:state',
]

export type PersistedState = SeedSnapshot

// Valid persisted Course statuses: the authorable draft/published the form offers
// (COURSE_STATUSES), plus the lifecycle-terminal 'closed' that only the
// closeCourse ceremony sets (ADR-0024). 'closed' is accepted here so a stored
// closed Course rehydrates rather than reseeding — old draft/published snapshots
// stay valid, so STATE_KEY does not bump. It is deliberately kept out of
// COURSE_STATUSES so the authoring form never offers it as a manual choice.
const PERSISTED_COURSE_STATUSES = [...COURSE_STATUSES, 'closed'] as const

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function clearLegacyKeys(): void {
  if (!isBrowser()) return
  LEGACY_SNAPSHOT_KEYS.forEach((key) => window.localStorage.removeItem(key))
}

function isValidSnapshot(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  // The Demo Epoch is a required scalar (ADR-0014): a snapshot lacking it is a
  // pre-clock-seam world and must reseed rather than render against a clock with
  // no anchor.
  if (typeof v.demoEpoch !== 'string') return false

  if (
    !Array.isArray(v.programs) ||
    !Array.isArray(v.students) ||
    !Array.isArray(v.teachers) ||
    !Array.isArray(v.courses) ||
    !Array.isArray(v.enrollments) ||
    !Array.isArray(v.grades) ||
    !Array.isArray(v.certificates) ||
    !Array.isArray(v.tcuTrainees) ||
    !Array.isArray(v.tcuActivities) ||
    !Array.isArray(v.attendance) ||
    !Array.isArray(v.auditLog) ||
    !Array.isArray(v.emailCampaigns)
  ) {
    return false
  }

  // Every Program is the catalog shape (ADR-0015): a stable id and Spanish
  // name/description strings. A pre-Program (v3) snapshot lacks this array
  // entirely and is rejected above.
  const programs = v.programs as unknown[]
  for (const program of programs) {
    if (!program || typeof program !== 'object') return false
    const p = program as Record<string, unknown>
    if (
      typeof p.id !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.description !== 'string'
    ) {
      return false
    }
  }

  // Every course must have term (with start and end strings) and meetingDays (array)
  const courses = v.courses as unknown[]
  for (const course of courses) {
    // Defensive: reject non-object entries
    if (!course || typeof course !== 'object') return false

    const c = course as Record<string, unknown>
    // Check term exists and has start/end strings
    if (!c.term || typeof c.term !== 'object') return false
    const term = c.term as Record<string, unknown>
    if (typeof term.start !== 'string' || typeof term.end !== 'string') return false

    // Check meetingDays is an array of known weekday literals — an unknown
    // literal would wrap to Sunday in the sessions module's weekday mapping
    if (!Array.isArray(c.meetingDays)) return false
    if (!c.meetingDays.every((d) => WEEKDAYS.includes(d as Weekday))) return false

    // A pre-Sede Course carries `headquartersName` and no `sede`; reject it so
    // the app reseeds at a fresh Sede-valued world rather than rendering blanks
    // (ADR-0003, ADR-0011).
    if (!SEDES.includes(c.sede as Sede)) return false

    // A pre-Program (v3) Course carries `programName` and no `programId`, level,
    // status, or capacity; reject it so the app reseeds at a fresh v4 world
    // rather than rendering a catalog that cannot resolve (ADR-0015/0016).
    if (typeof c.programId !== 'string') return false
    if (!COURSE_LEVELS.includes(c.level as (typeof COURSE_LEVELS)[number])) return false
    if (!PERSISTED_COURSE_STATUSES.includes(c.status as (typeof PERSISTED_COURSE_STATUSES)[number]))
      return false
    if (typeof c.capacity !== 'number') return false
  }

  // Every Certificate is the post-rework shape (ADR-0024): emitted on course-close
  // with a required `issuedAt` and no `status`/`approvedAt`. A v9 cert carries
  // `status` + `createdAt` but no `issuedAt`, so it is rejected and the world
  // reseeds rather than rehydrating an approval-era Certificate.
  for (const certificate of v.certificates as unknown[]) {
    if (!certificate || typeof certificate !== 'object') return false
    const c = certificate as Record<string, unknown>
    if (
      typeof c.id !== 'string' ||
      typeof c.studentId !== 'string' ||
      typeof c.courseId !== 'string' ||
      typeof c.score !== 'number' ||
      typeof c.issuedAt !== 'string'
    ) {
      return false
    }
  }

  // Teacher and Student each gained a required Sede; an old snapshot lacking it
  // is stale and must reseed rather than render Sede-less rows.
  const people = [...(v.teachers as unknown[]), ...(v.students as unknown[])]
  for (const person of people) {
    if (!person || typeof person !== 'object') return false
    if (!SEDES.includes((person as Record<string, unknown>).sede as Sede)) return false
  }

  // Every Student gained a required encargado (guardian) at v6; a pre-guardian
  // snapshot is stale and must reseed rather than render a blank contact card.
  for (const student of v.students as unknown[]) {
    const guardian = (student as Record<string, unknown>).guardian
    if (!guardian || typeof guardian !== 'object') return false
    const g = guardian as Record<string, unknown>
    if (typeof g.name !== 'string' || typeof g.phone !== 'string') return false
  }

  return true
}

export function loadPersistedState(): PersistedState | null {
  if (!isBrowser()) return null
  // Drop any stale pre-v2 snapshot before reading the current key.
  clearLegacyKeys()
  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function savePersistedState(state: PersistedState): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or serialization failure — best-effort persistence.
  }
}

export function clearPersistedState(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(STATE_KEY)
}

export function loadPersistedRole(): Role | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(ROLE_KEY)
  if (raw === 'admin' || raw === 'teacher' || raw === 'student' || raw === 'tcu') return raw
  return null
}

export function savePersistedRole(role: Role): void {
  if (!isBrowser()) return
  window.localStorage.setItem(ROLE_KEY, role)
}

export function clearPersistedRole(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(ROLE_KEY)
}

const CURRENT_USER_KEY = 'fundavida:v2:current-user'

export function loadPersistedCurrentUser(): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(CURRENT_USER_KEY)
}

export function savePersistedCurrentUser(userId: string): void {
  if (!isBrowser()) return
  window.localStorage.setItem(CURRENT_USER_KEY, userId)
}

export function clearPersistedCurrentUser(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(CURRENT_USER_KEY)
}

export type Locale = 'en' | 'es'

const LOCALE_KEY = 'fundavida:v2:locale'

export function loadPersistedLocale(): Locale | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(LOCALE_KEY)
  if (raw === 'en' || raw === 'es') return raw
  return null
}

export function savePersistedLocale(locale: Locale): void {
  if (!isBrowser()) return
  window.localStorage.setItem(LOCALE_KEY, locale)
}

export function clearPersistedLocale(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(LOCALE_KEY)
}
