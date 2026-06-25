import { describe, it, expect, beforeEach } from 'vitest'
import { certificatesApi } from '../api/certificates'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('certificatesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all certificates for admin, pending and approved alike', async () => {
    useStore.getState().setRole('admin')
    const result = await certificatesApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((c) => c.status === 'pending')).toBe(true)
    expect(result.some((c) => c.status === 'approved')).toBe(true)
  })

  it('a student sees only their own certificates (ADR-0012)', async () => {
    useStore.getState().setRole('student')
    const result = await certificatesApi.list()
    expect(result.every((c) => c.studentId === 'stu-1')).toBe(true)
  })

  it('a teacher sees no certificates', async () => {
    useStore.getState().setRole('teacher')
    expect(await certificatesApi.list()).toEqual([])
  })

  it('a tcu trainee sees no certificates', async () => {
    useStore.getState().setRole('tcu')
    expect(await certificatesApi.list()).toEqual([])
  })

  it('filters by status', async () => {
    useStore.getState().setRole('admin')
    const pending = await certificatesApi.list({ status: 'pending' })
    expect(pending.length).toBeGreaterThan(0)
    expect(pending.every((c) => c.status === 'pending')).toBe(true)
  })
})
