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
    savePersistedState(snapshot)
    const loaded = loadPersistedState()
    expect(loaded?.students.length).toBe(snapshot.students.length)
  })

  it('persists and loads a role independently', () => {
    savePersistedRole('teacher')
    expect(loadPersistedRole()).toBe('teacher')
  })

  it('clearPersistedState wipes both keys', () => {
    savePersistedState(buildSeedSnapshot())
    savePersistedRole('admin')
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBeNull()
  })

  it('returns null when stored JSON has the wrong shape', () => {
    window.localStorage.setItem('fundavida:v1:state', JSON.stringify({ wrong: true }))
    expect(loadPersistedState()).toBeNull()
  })

  it('returns null when stored JSON is invalid', () => {
    window.localStorage.setItem('fundavida:v1:state', 'not-json')
    expect(loadPersistedState()).toBeNull()
  })
})
