import type { SeedSnapshot } from './seed'
import type { Role } from '@/types'

const STATE_KEY = 'fundavida:v1:state'
const ROLE_KEY = 'fundavida:v1:role'

export interface PersistedState extends SeedSnapshot {
  role: Role | null
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadPersistedState(): PersistedState | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
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
  window.localStorage.removeItem(ROLE_KEY)
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
