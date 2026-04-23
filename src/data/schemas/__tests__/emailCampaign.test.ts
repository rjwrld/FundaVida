import { describe, it, expect } from 'vitest'
import { buildEmailCampaignSchema } from '../emailCampaign'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildEmailCampaignSchema>[0]
const emailCampaignSchema = buildEmailCampaignSchema(tStub)

describe('emailCampaignSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hello',
      body: 'This is a test message.',
      filterKind: 'all',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short subject', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hi',
      body: 'This is a test message.',
      filterKind: 'all',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'subject')
      expect(issue?.code).toBe('too_small')
    }
  })

  it('rejects short body', () => {
    const result = emailCampaignSchema.safeParse({
      subject: 'Hello',
      body: 'too short',
      filterKind: 'all',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'body')
      expect(issue?.code).toBe('too_small')
    }
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
      expect(issue?.message).toBe('validation.selectValue')
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
