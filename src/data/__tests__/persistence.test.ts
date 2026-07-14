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

  it('persists state under the v16 key', () => {
    savePersistedState(seedDemo(new Date()))
    expect(window.localStorage.getItem('fundavida:v16:state')).not.toBeNull()
  })

  it('reseeds from a stale v15 snapshot and removes the stale v15 state key (ADR-0048)', () => {
    // A returning v15 visitor's world carries the old two-exception overlay, so their
    // month term map has nothing to narrate. The snapshot is structurally valid —
    // only the key bump makes it stale — so it is dropped and the world reseeds with
    // an exception on every live cohort.
    window.localStorage.setItem('fundavida:v15:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v15:state')).toBeNull()
  })

  it('reseeds from a stale v14 snapshot and removes the stale v14 state key (ADR-0045)', () => {
    // A returning v14 visitor's outbox is in English. The snapshot is structurally
    // valid — only the key bump makes it stale — so it is dropped and the world
    // reseeds with the Spanish campaign bodies.
    window.localStorage.setItem('fundavida:v14:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v14:state')).toBeNull()
  })

  it('reseeds from a stale v13 snapshot and removes the stale v13 state key (ADR-0041)', () => {
    // A returning v13 visitor's campaigns predate the `audience` field. The v14 key
    // bump makes the snapshot stale; it is dropped so the app reseeds with
    // audience-bearing campaigns rather than migrating a default in place.
    window.localStorage.setItem('fundavida:v13:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v13:state')).toBeNull()
  })

  it('reseeds from a stale v12 snapshot and removes the stale v12 state key (ADR-0040)', () => {
    // A returning v12 visitor's snapshot predates the announcements slice. The v13
    // key bump makes it stale; it is dropped so the app reseeds with a feed rather
    // than rehydrating a store whose announcements slice is undefined.
    window.localStorage.setItem('fundavida:v12:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v12:state')).toBeNull()
  })

  it('reseeds from a stale v11 snapshot and removes the stale v11 state key (ADR-0044)', () => {
    // A returning v11 visitor's snapshot carries the pre-liveliness seed (three of
    // four personas land on an empty week). A later key bump makes it stale; it is
    // dropped so the app reseeds at the new world rather than migrating.
    window.localStorage.setItem('fundavida:v11:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v11:state')).toBeNull()
  })

  it('reseeds from a stale v2 snapshot and removes the stale v2 state key (ADR-0014)', () => {
    // A returning v2 visitor's snapshot predates the explicit Demo Epoch. The
    // key bump makes it stale; it is dropped so the app reseeds afresh.
    window.localStorage.setItem('fundavida:v2:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v2:state')).toBeNull()
  })

  it('reseeds from a stale v3 snapshot and removes the stale v3 state key (ADR-0015)', () => {
    // A returning v3 visitor's snapshot predates the Program entity and the new
    // Course/Enrollment/TCU fields. The v4 key bump makes it stale; it is dropped
    // so the app reseeds at v4 rather than rehydrating a programless world.
    window.localStorage.setItem('fundavida:v3:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v3:state')).toBeNull()
  })

  it('reseeds from a stale v4 snapshot and removes the stale v4 state key', () => {
    // A returning v4 visitor's snapshot predates the Costa Rican name pools and
    // @fundavida.es emails. The v5 key bump makes it stale; it is dropped so the
    // app reseeds afresh rather than rehydrating Anglo faker names.
    window.localStorage.setItem('fundavida:v4:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v4:state')).toBeNull()
  })

  it('reseeds from a stale v5 snapshot and removes the stale v5 state key', () => {
    // A returning v5 visitor's snapshot predates the Student encargado and the
    // teacher province/canton. The v6 key bump makes it stale; it is dropped so
    // the app reseeds rather than rehydrating guardian-less students.
    window.localStorage.setItem('fundavida:v5:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v5:state')).toBeNull()
  })

  it('reseeds from a stale v6 snapshot and removes the stale v6 state key', () => {
    // A returning v6 visitor's snapshot predates single-level Courses (ADR-0020)
    // and human Course names (ADR-0021). The v7 key bump makes it stale; it is
    // dropped so the app reseeds rather than rehydrating 'both'-level Courses.
    window.localStorage.setItem('fundavida:v6:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v6:state')).toBeNull()
  })

  it('reseeds from a stale v7 snapshot and removes the stale v7 state key', () => {
    // A returning v7 visitor's snapshot predates the level-neutral Program
    // descriptions. The v8 key bump makes it stale; it is dropped so the app
    // reseeds rather than rehydrating a Course whose blurb contradicts its level.
    window.localStorage.setItem('fundavida:v7:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v7:state')).toBeNull()
  })

  it('reseeds from a stale v8 snapshot and removes the stale v8 state key', () => {
    // A returning v8 visitor's snapshot predates the Spanish TCU activity titles.
    // The v9 key bump makes it stale; it is dropped so the app reseeds rather than
    // rehydrating English service-activity titles.
    window.localStorage.setItem('fundavida:v8:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v8:state')).toBeNull()
  })

  it('reseeds from a stale v9 snapshot and removes the stale v9 state key (ADR-0024)', () => {
    // A returning v9 visitor's snapshot predates the Certificate rework: its certs
    // carry status/approvedAt instead of issuedAt. The v10 key bump makes it stale;
    // it is dropped so the app reseeds rather than rehydrating approval-era certs.
    window.localStorage.setItem('fundavida:v9:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v9:state')).toBeNull()
  })

  it('reseeds from a stale v10 snapshot and removes the stale v10 state key (ADR-0039)', () => {
    // A returning v10 visitor's snapshot predates the sessionExceptions slice. The
    // v11 key bump makes it stale; it is dropped so the app reseeds rather than
    // rehydrating Sessions with no overlay.
    window.localStorage.setItem('fundavida:v10:state', JSON.stringify(seedDemo(new Date())))

    expect(loadPersistedState()).toBeNull()
    expect(window.localStorage.getItem('fundavida:v10:state')).toBeNull()
  })

  it('rejects a snapshot lacking the sessionExceptions slice (pre-v11 reseeds, ADR-0039)', () => {
    const snapshot = seedDemo(new Date()) as unknown as Record<string, unknown>
    delete snapshot.sessionExceptions
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot lacking the announcements slice (pre-v13 reseeds, ADR-0040)', () => {
    const snapshot = seedDemo(new Date()) as unknown as Record<string, unknown>
    delete snapshot.announcements
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot whose certificate has the v9 shape (status, no issuedAt)', () => {
    // A v9-shaped Certificate (pending/approved status, createdAt, no issuedAt)
    // under the v10 key must be rejected so the world reseeds (ADR-0024).
    const snapshot = seedDemo(new Date())
    expect(snapshot.certificates.length).toBeGreaterThan(0)
    const cert = snapshot.certificates[0] as unknown as Record<string, unknown>
    delete cert.issuedAt
    cert.status = 'approved'
    cert.createdAt = new Date().toISOString()
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot whose students lack the encargado (pre-guardian reseeds)', () => {
    const snapshot = seedDemo(new Date())
    const student = snapshot.students[0] as unknown as Record<string, unknown>
    delete student.guardian
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
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
    window.localStorage.setItem('fundavida:v8:state', JSON.stringify({ wrong: true }))
    expect(loadPersistedState()).toBeNull()
  })

  it('returns null when stored JSON is invalid', () => {
    window.localStorage.setItem('fundavida:v8:state', 'not-json')
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot missing the programs catalog (pre-Program reseeds)', () => {
    const snapshot = seedDemo(new Date()) as unknown as Record<string, unknown>
    delete snapshot.programs
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot with a course missing programId (pre-Program reseeds)', () => {
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    delete course.programId
    savePersistedState(snapshot as never)
    expect(loadPersistedState()).toBeNull()
  })

  it('rejects a snapshot with a course missing level/status/capacity', () => {
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    delete course.level
    savePersistedState(snapshot as never)
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

  it('accepts a snapshot with a closed course and round-trips its status (ADR-0024, no key bump)', () => {
    // closeCourse introduces a third CourseStatus, 'closed'. A snapshot carrying
    // it is valid — old draft/published worlds stay valid too, so STATE_KEY does
    // not bump and a stored closed Course rehydrates rather than reseeding.
    const snapshot = seedDemo(new Date())
    const course = snapshot.courses[0] as unknown as Record<string, unknown>
    course.status = 'closed'
    savePersistedState(snapshot)

    const loaded = loadPersistedState()
    expect(loaded).not.toBeNull()
    expect(loaded?.courses[0]?.status).toBe('closed')
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
