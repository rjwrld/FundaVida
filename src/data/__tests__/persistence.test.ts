import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearPersistedState,
  loadPersistedRole,
  loadPersistedState,
  savePersistedRole,
  savePersistedState,
} from '../persistence'
import { buildSeedSnapshot } from '../seed'

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing is persisted', () => {
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBeNull()
  })

  it('round-trips a persisted snapshot', () => {
    const snapshot = buildSeedSnapshot()
    savePersistedState({ ...snapshot, role: 'admin' })
    const loaded = loadPersistedState()
    expect(loaded?.students.length).toBe(snapshot.students.length)
    expect(loaded?.role).toBe('admin')
  })

  it('persists and loads a role independently', () => {
    savePersistedRole('teacher')
    expect(loadPersistedRole()).toBe('teacher')
  })

  it('clearPersistedState wipes both keys', () => {
    savePersistedState({ ...buildSeedSnapshot(), role: 'admin' })
    savePersistedRole('admin')
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBeNull()
  })
})
