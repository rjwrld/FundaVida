import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCurrentPersona } from '@/hooks/useCurrentPersona'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('useCurrentPersona', () => {
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

  it('returns null when no role is selected', () => {
    const { result } = renderHook(() => useCurrentPersona())
    expect(result.current).toBeNull()
  })

  it('resolves the teacher persona to its Teacher record', () => {
    useStore.getState().setRole('teacher')
    const { result } = renderHook(() => useCurrentPersona())

    const teacher = useStore.getState().teachers.find((t) => t.id === 'tea-1')
    if (!teacher) throw new Error('seed should carry the tea-1 persona')
    expect(result.current).toMatchObject({ id: 'tea-1', role: 'teacher' })
    expect(result.current?.person).toBe(teacher)
  })

  it('resolves the student persona to its Student record', () => {
    useStore.getState().setRole('student')
    const { result } = renderHook(() => useCurrentPersona())

    const student = useStore.getState().students.find((s) => s.id === 'stu-1')
    if (!student) throw new Error('seed should carry the stu-1 persona')

    const person = result.current?.person
    expect(person).toBe(student)
    // The record a display surface gets is the one `fullName` keys on, whichever roster
    // it came from — that shared shape is the point of the union.
    expect(person && fullName(person)).toBe(fullName(student))
  })

  // The branch the old useCurrentUser never had: a TCU trainee is a person in the
  // seeded graph like any other, and a display surface that misses it renders a
  // signed-in user with no name.
  it('resolves the tcu persona to its TcuTrainee record', () => {
    useStore.getState().setRole('tcu')
    const { result } = renderHook(() => useCurrentPersona())

    const trainee = useStore.getState().tcuTrainees.find((t) => t.id === 'tcu-1')
    if (!trainee) throw new Error('seed should carry the tcu-1 persona')
    expect(result.current).toMatchObject({ id: 'tcu-1', role: 'tcu' })
    expect(result.current?.person).toBe(trainee)
  })

  // Admin is a seat, not a person: it has an id to act as (audit actorId) but no
  // record in the graph, so `person` is undefined rather than the hook returning null.
  it('returns the admin persona with no person record', () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCurrentPersona())

    expect(result.current).toEqual({ id: 'admin', role: 'admin', person: undefined })
  })

  it('re-resolves when the role switches', () => {
    useStore.getState().setRole('teacher')
    const { result, rerender } = renderHook(() => useCurrentPersona())
    expect(result.current?.role).toBe('teacher')

    useStore.getState().setRole('student')
    rerender()

    expect(result.current?.id).toBe('stu-1')
    expect(result.current?.person).toBe(useStore.getState().students.find((s) => s.id === 'stu-1'))
  })
})
