import { describe, it, expect, beforeEach } from 'vitest'
import { tcuApi } from '../api/tcu'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('tcuApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all activities for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own activities for tcu trainee (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.traineeId === 'tcu-1')).toBe(true)
  })

  it('returns empty for student role', async () => {
    useStore.getState().setRole('student')
    expect(await tcuApi.list()).toEqual([])
  })

  it('returns empty for teacher role', async () => {
    useStore.getState().setRole('teacher')
    expect(await tcuApi.list()).toEqual([])
  })

  it('filters by traineeId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const all = await tcuApi.list()
    const targetTrainee = all[0]?.traineeId
    if (!targetTrainee) throw new Error('no tcu activities in seed')
    const result = await tcuApi.list({ traineeId: targetTrainee })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.traineeId === targetTrainee)).toBe(true)
  })
})
