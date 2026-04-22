import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
  loadPersistedCurrentUser,
  loadPersistedRole,
  loadPersistedState,
  savePersistedCurrentUser,
  savePersistedRole,
  savePersistedState,
} from '../persistence'
import { buildSeedSnapshot } from '../seed'

describe('persistence', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
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

  it('clearPersistedState wipes only the state key, not the role', () => {
    savePersistedState(buildSeedSnapshot())
    savePersistedRole('admin')
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBe('admin')
  })

  it('clearPersistedRole wipes only the role key, not state', () => {
    savePersistedState(buildSeedSnapshot())
    savePersistedRole('admin')
    clearPersistedRole()
    expect(loadPersistedRole()).toBeNull()
    expect(loadPersistedState()).not.toBeNull()
  })

  it('returns null when stored JSON has the wrong shape', () => {
    window.localStorage.setItem('fundavida:v1:state', JSON.stringify({ wrong: true }))
    expect(loadPersistedState()).toBeNull()
  })

  it('returns null when stored JSON is invalid', () => {
    window.localStorage.setItem('fundavida:v1:state', 'not-json')
    expect(loadPersistedState()).toBeNull()
  })

  it('persists and loads currentUserId independently', () => {
    savePersistedCurrentUser('tea-1')
    expect(loadPersistedCurrentUser()).toBe('tea-1')
  })

  it('clearPersistedCurrentUser wipes only the current-user key', () => {
    savePersistedCurrentUser('tea-1')
    savePersistedRole('teacher')
    clearPersistedCurrentUser()
    expect(loadPersistedCurrentUser()).toBeNull()
    expect(loadPersistedRole()).toBe('teacher')
  })
})
