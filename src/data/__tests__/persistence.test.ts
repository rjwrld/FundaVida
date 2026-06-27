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
import { seedDemo } from '../seed'

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
    const snapshot = seedDemo(new Date())
    savePersistedState(snapshot)
    const loaded = loadPersistedState()
    expect(loaded?.students.length).toBe(snapshot.students.length)
  })

  it('persists state under the v3 key', () => {
    savePersistedState(seedDemo(new Date()))
    expect(window.localStorage.getItem('fundavida:v3:state')).not.toBeNull()
  })

  it('reseeds from a stale v2 snapshot and removes the stale v2 state key (ADR-0014)', () => {
    // A returning v2 visitor's snapshot predates the explicit Demo Epoch. The
    // v3 key bump makes it stale; it is dropped so the app reseeds at v3.
    window.localStorage.setItem('fundavida:v2:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v2:state')).toBeNull()
  })

  it('reseeds cleanly from a stale v1 snapshot and removes the stale v1 keys', () => {
    // A returning v1 visitor: valid-looking v1 data lingers under the old keys.
    const legacy = seedDemo(new Date())
    window.localStorage.setItem('fundavida:v1:state', JSON.stringify(legacy))
    window.localStorage.setItem('fundavida:v1:role', 'admin')
    window.localStorage.setItem('fundavida:v1:current-user', 'admin')

    // Loading at v2 finds nothing to load (so the app reseeds)...
    expect(loadPersistedState()).toBeNull()
    // ...and the stale v1 keys are gone, never to be read again.
    expect(window.localStorage.getItem('fundavida:v1:state')).toBeNull()
    expect(window.localStorage.getItem('fundavida:v1:role')).toBeNull()
    expect(window.localStorage.getItem('fundavida:v1:current-user')).toBeNull()
  })

  it('preserves UI-preference keys (theme, banner) it does not own when clearing a stale snapshot', () => {
    window.localStorage.setItem('fundavida:v1:state', JSON.stringify(seedDemo(new Date())))
    window.localStorage.setItem('fundavida:v1:theme', 'dark')
    window.localStorage.setItem('fundavida:v1:banner-dismissed', '1')

    expect(loadPersistedState()).toBeNull()
    // The snapshot key is cleared...
    expect(window.localStorage.getItem('fundavida:v1:state')).toBeNull()
    // ...but UI preferences owned by useTheme / DemoBanner survive the reseed.
    expect(window.localStorage.getItem('fundavida:v1:theme')).toBe('dark')
    expect(window.localStorage.getItem('fundavida:v1:banner-dismissed')).toBe('1')

    window.localStorage.removeItem('fundavida:v1:theme')
    window.localStorage.removeItem('fundavida:v1:banner-dismissed')
  })

  it('persists and loads a role independently', () => {
    savePersistedRole('teacher')
    expect(loadPersistedRole()).toBe('teacher')
  })

  it('clearPersistedState wipes only the state key, not the role', () => {
    savePersistedState(seedDemo(new Date()))
    savePersistedRole('admin')
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBe('admin')
  })

  it('clearPersistedRole wipes only the role key, not state', () => {
    savePersistedState(seedDemo(new Date()))
    savePersistedRole('admin')
    clearPersistedRole()
    expect(loadPersistedRole()).toBeNull()
    expect(loadPersistedState()).not.toBeNull()
  })

  it('returns null when stored JSON has the wrong shape', () => {
    window.localStorage.setItem('fundavida:v3:state', JSON.stringify({ wrong: true }))
    expect(loadPersistedState()).toBeNull()
  })

  it('returns null when stored JSON is invalid', () => {
    window.localStorage.setItem('fundavida:v3:state', 'not-json')
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with courses missing term field', () => {
    const snapshot = seedDemo(new Date())
    const courseWithoutTerm = snapshot.courses[0] as unknown as Record<string, unknown>
    const { term: _term, ...courseRest } = courseWithoutTerm
    ;(snapshot.courses as unknown[])[0] = courseRest
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with courses missing meetingDays field', () => {
    const snapshot = seedDemo(new Date())
    const courseWithoutMeetingDays = snapshot.courses[0] as unknown as Record<string, unknown>
    const { meetingDays: _meetingDays, ...courseRest } = courseWithoutMeetingDays
    ;(snapshot.courses as unknown[])[0] = courseRest
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with a course missing sede (pre-Sede snapshot reseeds)', () => {
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    delete course.sede
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with an unknown sede literal on a course', () => {
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    course.sede = 'San José HQ'
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with a teacher missing sede', () => {
    const snapshot = seedDemo(new Date())
    const teacher = snapshot.teachers[0] as unknown as Record<string, unknown>
    delete teacher.sede
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with a student missing sede', () => {
    const snapshot = seedDemo(new Date())
    const student = snapshot.students[0] as unknown as Record<string, unknown>
    delete student.sede
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot lacking demoEpoch so an epoch-less world reseeds (ADR-0014)', () => {
    const snapshot = seedDemo(new Date()) as unknown as Record<string, unknown>
    delete snapshot.demoEpoch
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot whose demoEpoch is not a string', () => {
    const snapshot = seedDemo(new Date()) as unknown as Record<string, unknown>
    snapshot.demoEpoch = 1234567890
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('accepts a snapshot carrying demoEpoch and round-trips it', () => {
    const snapshot = seedDemo(new Date('2026-06-23T12:00:00.000Z'))
    savePersistedState(snapshot)
    expect(loadPersistedState()?.demoEpoch).toBe('2026-06-23T12:00:00.000Z')
  })

  it('rejects snapshot with unknown meeting-day literals', () => {
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    course.meetingDays = ['mon', 'pwned']
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with null course entry without throwing', () => {
    const snapshot = seedDemo(new Date())
    ;(snapshot.courses as unknown[]) = [null, ...snapshot.courses]
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects snapshot with string course entry without throwing', () => {
    const snapshot = seedDemo(new Date())
    ;(snapshot.courses as unknown[]) = ['not-a-course', ...snapshot.courses]
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('accepts valid snapshot with term and meetingDays and round-trips', () => {
    const snapshot = seedDemo(new Date())
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
