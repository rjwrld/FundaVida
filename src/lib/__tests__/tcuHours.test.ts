import { describe, it, expect } from 'vitest'
import { tcuHoursByStatus, TCU_TARGET_HOURS } from '../tcuHours'
import type { TcuActivity } from '@/types'

function activity(over: Partial<TcuActivity> = {}): TcuActivity {
  return {
    id: 'act-1',
    traineeId: 'tcu-1',
    title: 'Taller',
    hours: 10,
    date: '2026-05-01T00:00:00.000Z',
    status: 'pending',
    ...over,
  }
}

describe('tcuHoursByStatus', () => {
  it('sums approved and pending hours into separate buckets', () => {
    const result = tcuHoursByStatus([
      activity({ id: 'a1', hours: 60, status: 'approved' }),
      activity({ id: 'a2', hours: 40, status: 'approved' }),
      activity({ id: 'a3', hours: 30, status: 'pending' }),
    ])
    expect(result).toEqual({ approved: 100, pending: 30 })
  })

  it('counts rejected hours toward neither bucket', () => {
    const result = tcuHoursByStatus([
      activity({ id: 'a1', hours: 25, status: 'approved' }),
      activity({ id: 'a2', hours: 999, status: 'rejected' }),
    ])
    expect(result).toEqual({ approved: 25, pending: 0 })
  })

  it('returns zeros for an empty list', () => {
    expect(tcuHoursByStatus([])).toEqual({ approved: 0, pending: 0 })
  })

  it('pins the 300-hour target', () => {
    expect(TCU_TARGET_HOURS).toBe(300)
  })
})
