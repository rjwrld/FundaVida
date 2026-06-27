import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDaySessions } from '../useDaySessions'
import { clock, setDemoEpoch } from '@/lib/clock'

describe('useDaySessions — selected day defaults to the frozen today (ADR-0014)', () => {
  beforeEach(() => {
    setDemoEpoch(new Date('2026-06-23T15:30:00.000Z'))
  })

  it('defaults the selected day to clock.today(), not live wall-time', () => {
    const { result } = renderHook(() => useDaySessions([]))
    expect(result.current.selected.getTime()).toBe(clock.today().getTime())
  })
})
