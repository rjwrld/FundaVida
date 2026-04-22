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

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await emailCampaignsApi.list()).toEqual([])
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
      recipientIds: ['stu-1'],
    })
    const after = await emailCampaignsApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after[0]?.subject).toBe('Fresh')
  })
})
