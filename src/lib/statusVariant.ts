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

// No `warning` in this map, deliberately (#347). ADR-0047 defines the `warning`
// dot as *actionable* grey — the thing you still have to do something about. An
// audit entry is history: it already happened, and nothing in this table is
// actionable. So the louder dot has no meaning to carry here, and every quiet
// action is `neutral`.
//
// `unenroll` is `destructive` but `withdraw` is not, and that asymmetry is the
// point: an admin removing someone else's enrollment is a removal, like `delete`,
// whereas a student leaving of their own accord is not a red event —
// `ENROLLMENT_VARIANT.withdrawn` already reads it as `neutral`, and the two maps
// agreeing with each other matters more than the two verbs looking symmetrical.
export const AUDIT_ACTION_VARIANT: Record<AuditAction, BadgeProps['variant']> = {
  create: 'success',
  enroll: 'success',
  approve: 'success',
  // The terminal success of the whole domain: closing a course is what emits
  // every certificate. It is not a routine edit and should not read as one.
  close: 'success',
  delete: 'destructive',
  unenroll: 'destructive',
  update: 'neutral',
  requestEnroll: 'neutral',
  withdraw: 'neutral',
  grade: 'neutral',
  log: 'neutral',
}
