import type { BadgeProps } from '@/components/ui/badge'
import type { AttendanceStatus, AuditAction, EnrollmentStatus, TcuActivityStatus } from '@/types'

// One place per domain enum where a status picks up its colour (issue #332).
// Before this, four pages each carried a private if-cascade, so "what colour is
// `excused`?" was answered four times and could drift per page.
//
// A `Record` rather than a cascade: it is exhaustive, so widening an enum is a
// typecheck failure here instead of a silent fallthrough to whatever the old
// bottom `return` happened to be. They are deliberately four maps, not one
// generic helper — the enums are unrelated and share no behaviour.
//
// Every variant below carries a status dot. `outline` and the other plain
// variants render none (see `ui/badge.tsx`), which would leave a status column
// with dots on some rows and not others, so they are never the answer here.

export const ATTENDANCE_VARIANT: Record<AttendanceStatus, BadgeProps['variant']> = {
  present: 'success',
  absent: 'destructive',
  excused: 'neutral',
}

export const ENROLLMENT_VARIANT: Record<EnrollmentStatus, BadgeProps['variant']> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  withdrawn: 'neutral',
}

export const TCU_VARIANT: Record<TcuActivityStatus, BadgeProps['variant']> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

// `grade` is the one audit action that is neither an outcome nor a removal, and
// it is the row an admin scans for, so it keeps the solid-dot `warning`. The
// rest of the greys were only ever grey by falling off the end of the cascade.
export const AUDIT_ACTION_VARIANT: Record<AuditAction, BadgeProps['variant']> = {
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
}
