import { describe, it, expect } from 'vitest'
import { startOfDay } from 'date-fns'
import { clock, setDemoEpoch } from '../clock'

// A fixed Demo Epoch makes business-time deterministic (ADR-0014): clock.now()
// returns the frozen instant demoEpoch + offset, never a live new Date().
const EPOCH = new Date('2026-06-23T15:30:00.000Z')

describe('clock — frozen business time (ADR-0014)', () => {
  it('now() returns the pinned epoch when the offset is zero', () => {
    setDemoEpoch(EPOCH)
    expect(clock.now().toISOString()).toBe(EPOCH.toISOString())
  })

  it('today() is the local-midnight start-of-day of the pinned epoch', () => {
    setDemoEpoch(EPOCH)
    expect(clock.today().getTime()).toBe(startOfDay(EPOCH).getTime())
  })

  it('shifts now() by the offset so date-travel only has to set offset', () => {
    const oneHour = 60 * 60 * 1000
    setDemoEpoch(EPOCH, oneHour)
    expect(clock.now().getTime()).toBe(EPOCH.getTime() + oneHour)
  })

  it('offset defaults to zero when re-pinned without one', () => {
    setDemoEpoch(EPOCH, 5000)
    setDemoEpoch(EPOCH)
    expect(clock.now().getTime()).toBe(EPOCH.getTime())
  })
})
