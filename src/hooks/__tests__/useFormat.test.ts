import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormat } from '../useFormat'
import { useStore } from '@/data/store'

describe('useFormat', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('returns EN-formatted values when locale is en', () => {
    const { result } = renderHook(() => useFormat())
    expect(result.current.formatPercent(0.5)).toBe('50%')
  })

  it('re-renders with ES formatting when locale changes', () => {
    const { result } = renderHook(() => useFormat())
    act(() => {
      useStore.getState().setLocale('es')
    })
    expect(result.current.formatPercent(0.5)).toMatch(/50\s*%/)
    expect(result.current.locale).toBe('es')
  })
})
