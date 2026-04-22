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

  it('accepts filterKind "all" without a filterValue', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hello',
      body: 'This is a test message.',
      filterKind: 'all',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-"all" filterKind without a filterValue', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hello',
      body: 'This is a test message.',
      filterKind: 'program',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'filterValue')
      expect(issue?.message).toBe('Select a value for the chosen filter')
    }
  })

  it('accepts non-"all" filterKind with a filterValue', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hello',
      body: 'This is a test message.',
      filterKind: 'program',
      filterValue: 'something',
    })
    expect(result.success).toBe(true)
  })
})
