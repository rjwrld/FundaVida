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

  it('returns only own activities for student (stu-1)', async () => {
    useStore.getState().setRole('student')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.studentId === 'stu-1')).toBe(true)
  })

  it('returns only organized activities for tcu (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await tcuApi.list()
    expect(result.every((a) => a.organizerId === 'tcu-1')).toBe(true)
  })

  it('returns empty for teacher role', async () => {
    useStore.getState().setRole('teacher')
    expect(await tcuApi.list()).toEqual([])
  })

  it('filters by studentId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const all = await tcuApi.list()
    const targetStudent = all[0]?.studentId
    if (!targetStudent) throw new Error('no tcu activities in seed')
    const result = await tcuApi.list({ studentId: targetStudent })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.studentId === targetStudent)).toBe(true)
  })

  it('filters by organizerId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const result = await tcuApi.list({ organizerId: 'tcu-1' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.organizerId === 'tcu-1')).toBe(true)
  })
})
