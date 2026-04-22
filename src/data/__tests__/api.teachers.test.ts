import { describe, it, expect, beforeEach } from 'vitest'
import { teachersApi } from '../api/teachers'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('teachersApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('list returns the full seed when role=admin', async () => {
    useStore.getState().setRole('admin')
    const result = await teachersApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('list returns an empty array when role is not admin', async () => {
    useStore.getState().setRole('teacher')
    expect(await teachersApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await teachersApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await teachersApi.list()).toEqual([])
  })

  it('list filters by search across first/last/email', async () => {
    useStore.getState().setRole('admin')
    const all = await teachersApi.list()
    const target = all[0]
    if (!target) throw new Error('no teachers in seed')
    const bySearch = await teachersApi.list({ search: target.firstName })
    expect(bySearch.some((t) => t.id === target.id)).toBe(true)
  })

  it('get returns a teacher for admin', async () => {
    useStore.getState().setRole('admin')
    const all = await teachersApi.list()
    const first = all[0]
    if (!first) throw new Error('no teachers in seed')
    expect(await teachersApi.get(first.id)).not.toBeNull()
  })

  it('get returns null for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await teachersApi.get('tea-1')).toBeNull()
    useStore.getState().setRole('student')
    expect(await teachersApi.get('tea-1')).toBeNull()
  })
})
