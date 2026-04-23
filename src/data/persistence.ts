import type { SeedSnapshot } from './seed'
import type { Role } from '@/types'

const STATE_KEY = 'fundavida:v1:state'
const ROLE_KEY = 'fundavida:v1:role'

export type PersistedState = SeedSnapshot

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidSnapshot(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.students) &&
    Array.isArray(v.teachers) &&
    Array.isArray(v.courses) &&
    Array.isArray(v.enrollments) &&
    Array.isArray(v.grades) &&
    Array.isArray(v.tcuActivities) &&
    Array.isArray(v.attendance) &&
    Array.isArray(v.auditLog) &&
    Array.isArray(v.emailCampaigns)
  )
}

export function loadPersistedState(): PersistedState | null {
  if (!isBrowser()) return null
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

const CURRENT_USER_KEY = 'fundavida:v1:current-user'

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

const LOCALE_KEY = 'fundavida:v1:locale'

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
