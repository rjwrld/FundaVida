import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('useCan hook', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('returns false when role is null', () => {
    const { result } = renderHook(() => useCan('create', 'courses'))
    expect(result.current).toBe(false)
  })

  it('returns true for admin creating courses', () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCan('create', 'courses'))
    expect(result.current).toBe(true)
  })

  it('returns true for teacher creating courses (ADR-0016)', () => {
    useStore.getState().setRole('teacher')
    const { result } = renderHook(() => useCan('create', 'courses'))
    expect(result.current).toBe(true)
  })

  it('returns false for student creating courses', () => {
    useStore.getState().setRole('student')
    const { result } = renderHook(() => useCan('create', 'courses'))
    expect(result.current).toBe(false)
  })

  it('returns true for admin deleting courses', () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCan('delete', 'courses'))
    expect(result.current).toBe(true)
  })

  it('returns true for admin editing courses', () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCan('edit', 'courses'))
    expect(result.current).toBe(true)
  })

  it('returns true for admin viewing certificates', () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCan('view', 'certificates'))
    expect(result.current).toBe(true)
  })
})
