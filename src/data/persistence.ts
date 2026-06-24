import type { SeedSnapshot } from './seed'
import { WEEKDAYS, type Role, type Weekday } from '@/types'
import { SEDES, type Sede } from '@/constants/sede'

const STATE_KEY = 'fundavida:v2:state'
const ROLE_KEY = 'fundavida:v2:role'

// Pre-v2 snapshot-session keys this layer owns. They are not migrated
// (ADR-0003): they are removed on first load so the app reseeds cleanly at a
// fresh Demo Epoch instead of rehydrating an incoherent v1 world. Only keys
// this module owns are listed — UI preferences such as theme and
// banner-dismissed belong to other modules and must survive a reseed, so they
// are deliberately left untouched.
const LEGACY_SNAPSHOT_KEYS = [
  'fundavida:v1:state',
  'fundavida:v1:role',
  'fundavida:v1:current-user',
  'fundavida:v1:locale',
]

export type PersistedState = SeedSnapshot

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

  if (
    !Array.isArray(v.students) ||
    !Array.isArray(v.teachers) ||
    !Array.isArray(v.courses) ||
    !Array.isArray(v.enrollments) ||
    !Array.isArray(v.grades) ||
    !Array.isArray(v.tcuActivities) ||
    !Array.isArray(v.attendance) ||
    !Array.isArray(v.auditLog) ||
    !Array.isArray(v.emailCampaigns)
  ) {
    return false
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
  }

  // Teacher and Student each gained a required Sede; an old snapshot lacking it
  // is stale and must reseed rather than render Sede-less rows.
  const people = [...(v.teachers as unknown[]), ...(v.students as unknown[])]
  for (const person of people) {
    if (!person || typeof person !== 'object') return false
    if (!SEDES.includes((person as Record<string, unknown>).sede as Sede)) return false
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
