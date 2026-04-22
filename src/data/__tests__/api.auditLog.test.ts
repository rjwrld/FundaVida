import { describe, it, expect, beforeEach } from 'vitest'
import { auditLogApi } from '../api/auditLog'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('auditLogApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns the seeded audit log for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await auditLogApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await auditLogApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await auditLogApi.list()).toEqual([])
  })

  it('filters by action', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list({ action: 'create' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.action === 'create')).toBe(true)
  })

  it('filters by entity', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list({ entity: 'student' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.entity === 'student')).toBe(true)
  })
})
