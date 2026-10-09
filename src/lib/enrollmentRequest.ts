import type { Course, Enrollment } from '@/types'
import { isOpenForEnrollment } from './courseDisplayState'

/**
 * Where a Student stands on requesting one Course:
 * - `request` — they may request a spot (a withdrawn or rejected record re-pends);
 * - `requested` — their request is pending a decision;
 * - `enrolled` — they hold an approved seat;
 * - `closed` — the Course no longer takes enrollments (ADR-0042).
 */
export type EnrollmentRequestState = 'request' | 'requested' | 'enrolled' | 'closed'

/**
 * The one request rule both the Course page and the Browse rows read (ADR-0051),
 * mirroring the store's own guards (ADR-0009): an active record short-circuits,
 * and otherwise only an open Course takes a request. Sede and Level need no check
 * here — the `browseable` scope only ever hands a Student Courses that match them
 * (ADR-0016), and the store re-checks both.
 */
export function enrollmentRequestState(
  course: Course,
  enrollment: Pick<Enrollment, 'status'> | undefined,
  now: Date
): EnrollmentRequestState {
  if (enrollment?.status === 'approved') return 'enrolled'
  if (enrollment?.status === 'pending') return 'requested'
  return isOpenForEnrollment(course, now) ? 'request' : 'closed'
}
