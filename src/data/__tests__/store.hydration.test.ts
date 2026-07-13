import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Student, Teacher, TcuTrainee } from '@/types'
import { reconcileSession } from '../store'

const ROLE_KEY = 'fundavida:v2:role'
const CURRENT_USER_KEY = 'fundavida:v2:current-user'

// Boot the store fresh so `initialState()` re-runs against whatever the test
// pre-seeded into localStorage — the module hydrates at import time, so the
// only way to exercise the hydration path is a clean re-import.
async function bootStore() {
  vi.resetModules()
  return await import('../store')
}

// reconcileSession only reads ids, so a skeletal graph is enough.
const graph = {
  students: [{ id: 'stu-1' }, { id: 'stu-2' }] as Student[],
  teachers: [{ id: 'tea-1' }, { id: 'tea-2' }] as Teacher[],
  tcuTrainees: [{ id: 'tcu-1' }] as TcuTrainee[],
}

describe('reconcileSession', () => {
  it('keeps a pair that already agrees', () => {
    expect(reconcileSession('teacher', 'tea-1', graph)).toEqual({
      role: 'teacher',
      currentUserId: 'tea-1',
    })
    expect(reconcileSession('admin', 'admin', graph)).toEqual({
      role: 'admin',
      currentUserId: 'admin',
    })
  })

  it('keeps a valid non-default id for the role', () => {
    expect(reconcileSession('teacher', 'tea-2', graph)).toEqual({
      role: 'teacher',
      currentUserId: 'tea-2',
    })
  })

  it('derives the id when a role is present without one', () => {
    expect(reconcileSession('admin', null, graph)).toEqual({
      role: 'admin',
      currentUserId: 'admin',
    })
    expect(reconcileSession('student', null, graph)).toEqual({
      role: 'student',
      currentUserId: 'stu-1',
    })
  })

  it('re-derives the id when it names nobody in the graph', () => {
    expect(reconcileSession('teacher', 'tea-999', graph)).toEqual({
      role: 'teacher',
      currentUserId: 'tea-1',
    })
  })

  it('re-derives the id when it names someone of another role', () => {
    expect(reconcileSession('teacher', 'stu-1', graph)).toEqual({
      role: 'teacher',
      currentUserId: 'tea-1',
    })
    expect(reconcileSession('admin', 'tea-1', graph)).toEqual({
      role: 'admin',
      currentUserId: 'admin',
    })
  })

  it('drops an orphan id when no role is set', () => {
    expect(reconcileSession(null, 'tea-1', graph)).toEqual({
      role: null,
      currentUserId: null,
    })
  })

  it('passes a fully signed-out pair through', () => {
    expect(reconcileSession(null, null, graph)).toEqual({
      role: null,
      currentUserId: null,
    })
  })
})

describe('hydration reconciliation at boot (#355)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('boots with a derived currentUserId when only the role key survived', async () => {
    window.localStorage.setItem(ROLE_KEY, 'admin')
    const { useStore } = await bootStore()
    expect(useStore.getState().role).toBe('admin')
    expect(useStore.getState().currentUserId).toBe('admin')
    // The repair is persisted, so the next boot starts in step.
    expect(window.localStorage.getItem(CURRENT_USER_KEY)).toBe('admin')
  })

  it('boots signed out and clears the orphan id when only the user key survived', async () => {
    window.localStorage.setItem(CURRENT_USER_KEY, 'tea-1')
    const { useStore } = await bootStore()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().currentUserId).toBeNull()
    expect(window.localStorage.getItem(CURRENT_USER_KEY)).toBeNull()
  })

  it('re-derives the persona when the persisted id names nobody in the graph', async () => {
    window.localStorage.setItem(ROLE_KEY, 'teacher')
    window.localStorage.setItem(CURRENT_USER_KEY, 'tea-999')
    const { useStore } = await bootStore()
    expect(useStore.getState().role).toBe('teacher')
    expect(useStore.getState().currentUserId).toBe('tea-1')
    expect(window.localStorage.getItem(CURRENT_USER_KEY)).toBe('tea-1')
  })

  it('keeps a persisted pair that already agrees', async () => {
    window.localStorage.setItem(ROLE_KEY, 'student')
    window.localStorage.setItem(CURRENT_USER_KEY, 'stu-1')
    const { useStore } = await bootStore()
    expect(useStore.getState().role).toBe('student')
    expect(useStore.getState().currentUserId).toBe('stu-1')
  })

  it('never attributes a mutation to system for a signed-in role', async () => {
    // The half-hydrated boot (#355): role present, id gone. Without
    // reconciliation this mutation would audit as 'system'.
    window.localStorage.setItem(ROLE_KEY, 'admin')
    const { useStore } = await bootStore()
    useStore.getState().createStudent({
      firstName: 'Nova',
      lastName: 'Pine',
      email: 'n@fv.cr',
      gender: 'F',
      sede: 'Linda Vista',
      province: 'X',
      canton: 'Y',
      educationalLevel: 'primaria',
      guardian: {
        name: 'Encargado Test',
        relationship: 'madre',
        phone: '8888-8888',
        email: 'enc@example.com',
      },
    })
    const entry = useStore.getState().auditLog[0]
    expect(entry?.actorId).toBe('admin')
  })
})
