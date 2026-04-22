import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'
import { useStore } from '../store'
import { clearPersistedRole, clearPersistedState } from '../persistence'

describe('api.students', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    useStore.getState().resetDemo()
  })

  it('admin sees all students', async () => {
    useStore.getState().setRole('admin')
    const list = await api.students.list()
    expect(list.length).toBe(useStore.getState().students.length)
  })

  it('student sees empty list in the generic list endpoint', async () => {
    useStore.getState().setRole('student')
    const list = await api.students.list()
    expect(list.length).toBe(0)
  })

  it('get returns the matching student by id', async () => {
    useStore.getState().setRole('admin')
    const first = useStore.getState().students[0]
    if (!first) throw new Error('expected at least one student in the seed')
    const found = await api.students.get(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('get returns null for an unknown id', async () => {
    useStore.getState().setRole('admin')
    const found = await api.students.get('stu-does-not-exist')
    expect(found).toBeNull()
  })
})
