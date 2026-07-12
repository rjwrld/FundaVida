import { describe, it, expect } from 'vitest'
import {
  ATTENDANCE_VARIANT,
  AUDIT_ACTION_VARIANT,
  ENROLLMENT_VARIANT,
  TCU_VARIANT,
} from '@/lib/statusVariant'

describe('status variant maps', () => {
  // These assertions pin the pixels the four pages used to render through their
  // private if-cascades (issue #332). A variant change here is a visual change
  // on every page that keys off the enum, which is the whole point of the extract.
  it('maps attendance statuses', () => {
    expect(ATTENDANCE_VARIANT).toEqual({
      present: 'success',
      absent: 'destructive',
      excused: 'neutral',
    })
  })

  it('maps enrollment statuses', () => {
    expect(ENROLLMENT_VARIANT).toEqual({
      pending: 'warning',
      approved: 'success',
      rejected: 'destructive',
      withdrawn: 'neutral',
    })
  })

  it('maps TCU activity statuses', () => {
    expect(TCU_VARIANT).toEqual({
      pending: 'warning',
      approved: 'success',
      rejected: 'destructive',
    })
  })

  it('maps audit actions', () => {
    expect(AUDIT_ACTION_VARIANT).toEqual({
      create: 'success',
      enroll: 'success',
      approve: 'success',
      close: 'success',
      delete: 'destructive',
      unenroll: 'destructive',
      update: 'neutral',
      requestEnroll: 'neutral',
      withdraw: 'neutral',
      grade: 'neutral',
      log: 'neutral',
    })
  })

  // ADR-0047 defines the `warning` dot as *actionable* grey. An audit entry is
  // history — nothing in the table is actionable — so the variant has nothing to
  // say here and must not creep back in (#347).
  it('never uses the actionable warning dot for a historical audit entry', () => {
    expect(Object.values(AUDIT_ACTION_VARIANT)).not.toContain('warning')
  })

  // The asymmetry is deliberate, not an oversight: an admin removing someone
  // else's enrollment is a removal; a student leaving of their own accord is not.
  it('reads an admin unenroll as a removal but a self-withdrawal as quiet', () => {
    expect(AUDIT_ACTION_VARIANT.unenroll).toBe('destructive')
    expect(AUDIT_ACTION_VARIANT.withdraw).toBe('neutral')
    // ...and the withdraw side agrees with how the enrollment funnel reads it.
    expect(AUDIT_ACTION_VARIANT.withdraw).toBe(ENROLLMENT_VARIANT.withdrawn)
  })

  // `outline` renders no status dot, so a status column would lose its dot on
  // exactly the rows that fell through the old cascade.
  it('never uses a dotless variant for a status', () => {
    const dotless = ['default', 'secondary', 'outline', 'ghost', 'link']
    const all = [
      ...Object.values(ATTENDANCE_VARIANT),
      ...Object.values(ENROLLMENT_VARIANT),
      ...Object.values(TCU_VARIANT),
      ...Object.values(AUDIT_ACTION_VARIANT),
    ]
    for (const variant of all) {
      expect(dotless).not.toContain(variant)
    }
  })
})
