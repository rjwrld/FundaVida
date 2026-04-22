import { describe, it, expect } from 'vitest'
import { emailCampaignSchema } from '../emailCampaign'

describe('emailCampaignSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hello',
        body: 'This is a test message.',
        filterKind: 'all',
      })
    ).not.toThrow()
  })

  it('rejects short subject', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hi',
        body: 'This is a test message.',
        filterKind: 'all',
      })
    ).toThrow()
  })

  it('rejects short body', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hello',
        body: 'too short',
        filterKind: 'all',
      })
    ).toThrow()
  })
})
