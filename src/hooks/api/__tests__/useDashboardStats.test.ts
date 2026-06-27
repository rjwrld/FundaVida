import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardStats } from '../useDashboardStats'
import { useStore } from '@/data/store'
import { clock, setDemoEpoch } from '@/lib/clock'
import { dashboardStatDeltas } from '@/lib/stats'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

const storeSnapshot = () => {
  const s = useStore.getState()
  return {
    students: s.students,
    enrollments: s.enrollments,
    certificates: s.certificates,
    tcuActivities: s.tcuActivities,
  }
}

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

  it('derives the today/this-month windows from the frozen clock, not wall-time', () => {
    // Override the clock to a far epoch after the real-now seed; the trend's last
    // bucket must be the frozen today, proving the window reads clock.today().
    setDemoEpoch(new Date('2099-06-15T12:00:00.000Z'))
    const { result } = renderHook(() => useDashboardStats())
    const trend = result.current.attendanceTrend
    expect(trend[trend.length - 1]?.day.getTime()).toBe(clock.today().getTime())
  })

  it('exposes real month-over-month deltas derived from the same dated data', () => {
    const { result } = renderHook(() => useDashboardStats())
    expect(result.current.deltas).toEqual(dashboardStatDeltas(storeSnapshot(), clock.now()))
  })

  it('recomputes deltas after a mutation (a fresh certificate approval)', () => {
    const pendingCert = useStore.getState().certificates.find((c) => c.status === 'pending')
    if (!pendingCert) throw new Error('expected a pending certificate in the seed')

    useStore.getState().approveCertificate(pendingCert.id)

    const { result } = renderHook(() => useDashboardStats())
    expect(result.current.deltas).toEqual(dashboardStatDeltas(storeSnapshot(), clock.now()))
  })
})
