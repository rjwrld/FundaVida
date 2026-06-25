import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardStats } from '../useDashboardStats'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('useDashboardStats — certificate-backed counts (#69)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('counts pending Certificates as pending approvals', () => {
    const { result } = renderHook(() => useDashboardStats())
    const pending = useStore.getState().certificates.filter((c) => c.status === 'pending').length
    expect(pending).toBeGreaterThan(0)
    expect(result.current.pendingApprovals).toBe(pending)
  })

  it('counts approved Certificates as certificates issued', () => {
    const { result } = renderHook(() => useDashboardStats())
    const approved = useStore.getState().certificates.filter((c) => c.status === 'approved').length
    expect(approved).toBeGreaterThan(0)
    expect(result.current.certsIssued).toBe(approved)
  })

  it('reflects a fresh approval: pending drops, issued rises', () => {
    const before = renderHook(() => useDashboardStats()).result.current
    const pendingCert = useStore.getState().certificates.find((c) => c.status === 'pending')
    if (!pendingCert) throw new Error('expected a pending certificate in the seed')

    useStore.getState().approveCertificate(pendingCert.id)

    const after = renderHook(() => useDashboardStats()).result.current
    expect(after.pendingApprovals).toBe(before.pendingApprovals - 1)
    expect(after.certsIssued).toBe(before.certsIssued + 1)
  })
})
