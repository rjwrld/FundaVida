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

  it('rejects snapshot with courses missing term field', () => {
    const snapshot = buildSeedSnapshot()
    const courseWithoutTerm = snapshot.courses[0] as unknown as Record<string, unknown>
    const { term: _term, ...courseRest } = courseWithoutTerm
    ;(snapshot.courses as unknown[])[0] = courseRest
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with courses missing meetingDays field', () => {
    const snapshot = buildSeedSnapshot()
    const courseWithoutMeetingDays = snapshot.courses[0] as unknown as Record<string, unknown>
    const { meetingDays: _meetingDays, ...courseRest } = courseWithoutMeetingDays
    ;(snapshot.courses as unknown[])[0] = courseRest
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with unknown meeting-day literals', () => {
    const snapshot = buildSeedSnapshot()
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    course.meetingDays = ['mon', 'pwned']
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with null course entry without throwing', () => {
    const snapshot = buildSeedSnapshot()
    ;(snapshot.courses as unknown[]) = [null, ...snapshot.courses]
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with string course entry without throwing', () => {
    const snapshot = buildSeedSnapshot()
    ;(snapshot.courses as unknown[]) = ['not-a-course', ...snapshot.courses]
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('accepts valid snapshot with term and meetingDays and round-trips', () => {
    const snapshot = buildSeedSnapshot()
    savePersistedState(snapshot)
    const loaded = loadPersistedState()
    expect(loaded).not.toBeNull()
    expect(loaded?.courses[0]?.term).toBeDefined()
    expect(loaded?.courses[0]?.term.start).toBeDefined()
    expect(loaded?.courses[0]?.term.end).toBeDefined()
    expect(loaded?.courses[0]?.meetingDays).toBeDefined()
    expect(Array.isArray(loaded?.courses[0]?.meetingDays)).toBe(true)
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
