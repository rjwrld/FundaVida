import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('useStore', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('seeds students, teachers, courses, enrollments, and grades', () => {
    const s = useStore.getState()
    expect(s.students.length).toBeGreaterThan(0)
    expect(s.teachers.length).toBeGreaterThan(0)
    expect(s.courses.length).toBeGreaterThan(0)
    expect(s.enrollments.length).toBeGreaterThan(0)
    expect(s.grades.length).toBeGreaterThan(0)
  })

  it('setRole persists and updates state', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().role).toBe('admin')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('admin')
  })

  it('resetDemo clears role and reseeds data', () => {
    useStore.getState().setRole('teacher')
    useStore.getState().resetDemo()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().students.length).toBeGreaterThan(0)
  })

  it('resetDemo clears the persisted role key so a reload does not rehydrate it', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('teacher')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:role')).toBeNull()
  })

  it('resetDemo clears the banner-dismissed flag so the banner reappears', () => {
    window.localStorage.setItem('fundavida:v1:banner-dismissed', '1')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:banner-dismissed')).toBeNull()
  })
})
