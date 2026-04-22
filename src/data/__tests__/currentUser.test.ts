import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('currentUserId', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('is null until a role is selected', () => {
    expect(useStore.getState().currentUserId).toBeNull()
  })

  it('maps admin role to the admin sentinel', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().currentUserId).toBe('admin')
  })

  it('maps teacher role to tea-1', () => {
    useStore.getState().setRole('teacher')
    expect(useStore.getState().currentUserId).toBe('tea-1')
  })

  it('maps student role to stu-1', () => {
    useStore.getState().setRole('student')
    expect(useStore.getState().currentUserId).toBe('stu-1')
  })

  it('resetDemo clears currentUserId', () => {
    useStore.getState().setRole('admin')
    useStore.getState().resetDemo()
    expect(useStore.getState().currentUserId).toBeNull()
  })

  it('persists currentUserId to localStorage', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v1:current-user')).toBe('tea-1')
  })
})
