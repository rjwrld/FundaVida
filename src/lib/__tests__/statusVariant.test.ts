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

  // The old cascade fell through to `neutral` for everything it did not name;
  // the Record has to spell those out, so they are the ones worth pinning.
  it('maps audit actions, including the five the old cascade left to fall through', () => {
    expect(AUDIT_ACTION_VARIANT).toEqual({
      create: 'success',
      enroll: 'success',
      approve: 'success',
      delete: 'destructive',
      grade: 'warning',
      update: 'neutral',
      requestEnroll: 'neutral',
      unenroll: 'neutral',
      withdraw: 'neutral',
      close: 'neutral',
      log: 'neutral',
    })
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
