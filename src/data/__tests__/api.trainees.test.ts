import { describe, it, expect, beforeEach } from 'vitest'
import { traineesApi } from '../api/trainees'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('traineesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all trainees for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await traineesApi.list()
    expect(result.length).toBeGreaterThan(1)
  })

  it('returns only the trainee themselves for tcu role (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await traineesApi.list()
    // A TCU volunteer must not see other volunteers in the roster (scope seam, ADR-0008).
    expect(result.map((t) => t.id)).toEqual(['tcu-1'])
  })

  it('returns empty for student role', async () => {
    useStore.getState().setRole('student')
    expect(await traineesApi.list()).toEqual([])
  })

  it('returns empty for teacher role', async () => {
    useStore.getState().setRole('teacher')
    expect(await traineesApi.list()).toEqual([])
  })
})
