import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { clock } from '@/lib/clock'

describe('store ↔ clock seam (ADR-0014)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('resetDemo re-anchors demoEpoch to real now and zeroes the offset', () => {
    const before = Date.now()
    useStore.getState().resetDemo()
    const after = Date.now()

    const { demoEpoch, offset } = useStore.getState()
    expect(offset).toBe(0)
    const epochMs = new Date(demoEpoch).getTime()
    expect(epochMs).toBeGreaterThanOrEqual(before)
    expect(epochMs).toBeLessThanOrEqual(after)
  })

  it('hydrates the clock so clock.now() reads the store epoch after reset', () => {
    useStore.getState().resetDemo()
    expect(clock.now().toISOString()).toBe(useStore.getState().demoEpoch)
  })
})
