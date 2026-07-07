import type { TcuActivity } from '@/types'

/**
 * The community-service target every TCU volunteer works toward: 300 hours
 * (ADR-0017). Both the dashboard and the list page measure progress against it,
 * so it lives here once rather than as a per-surface constant.
 */
export const TCU_TARGET_HOURS = 300

/** A volunteer's logged TCU hours split by approval status. */
export interface TcuHoursByStatus {
  /** Approved hours — the only ones that count toward {@link TCU_TARGET_HOURS}. */
  approved: number
  /** Pending hours — awaiting a Teacher's approval, surfaced separately. */
  pending: number
}

/**
 * Sum a volunteer's TCU hours by approval status. Only approved hours count
 * toward the 300-hour target (ADR-0017); pending hours are shown separately, not
 * folded into progress, and rejected hours count toward neither. The single home
 * for the approved/pending split that TcuDashboard and TcuListPage both derive,
 * so the two surfaces cannot diverge again — the divergence ADR-0036 closed (the
 * dashboard once summed ALL hours while the list page counted approved-only).
 */
export function tcuHoursByStatus(activities: TcuActivity[]): TcuHoursByStatus {
  return activities.reduce<TcuHoursByStatus>(
    (acc, a) => {
      if (a.status === 'approved') acc.approved += a.hours
      else if (a.status === 'pending') acc.pending += a.hours
      return acc
    },
    { approved: 0, pending: 0 }
  )
}
