import { describe, it, expect, beforeEach } from 'vitest'
import { emailCampaignsApi } from '../api/emailCampaigns'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('emailCampaignsApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns seeded campaigns for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await emailCampaignsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('scopes teacher history to their own campaigns (ADR-0041)', async () => {
    useStore.getState().setRole('teacher') // tea-1
    const teacherId = useStore.getState().currentUserId
    const result = await emailCampaignsApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((c) => c.sentBy === teacherId)).toBe(true)
  })

  it('returns empty for student and tcu roles (pinned none)', async () => {
    useStore.getState().setRole('student')
    expect(await emailCampaignsApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await emailCampaignsApi.list()).toEqual([])
  })

  it('includes newly-sent campaigns at the top', async () => {
    useStore.getState().setRole('admin')
    const before = await emailCampaignsApi.list()
    useStore.getState().sendEmailCampaign({
      subject: 'Fresh',
      body: 'Body text for the new campaign',
      filter: { kind: 'all' },
      audience: 'students',
      recipientIds: ['stu-1'],
    })
    const after = await emailCampaignsApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after[0]?.subject).toBe('Fresh')
  })
})
