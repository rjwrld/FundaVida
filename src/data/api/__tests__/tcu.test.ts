import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store'
import { tcuApi } from '../tcu'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '../../persistence'
import type { TcuActivity } from '@/types'

describe('tcuApi.list', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('returns activities newest first, whatever order the store holds them in', async () => {
    const template = useStore.getState().tcuActivities[0]
    if (!template) throw new Error('seed: no TCU activities')
    const activity = (id: string, date: string): TcuActivity => ({ ...template, id, date })
    useStore.setState({
      tcuActivities: [
        activity('a-mid', '2026-03-10'),
        activity('a-old', '2025-12-01'),
        activity('a-new', '2026-05-20'),
      ],
    })

    const listed = await tcuApi.list()

    expect(listed.map((a) => a.id)).toEqual(['a-new', 'a-mid', 'a-old'])
  })
})
