import type { TcuActivity } from '@/types'

// ISO dates compare chronologically as strings; the id breaks a same-day tie so
// the order is deterministic (numeric-aware, so act-10 follows act-9).
function compareOldestFirst(a: TcuActivity, b: TcuActivity): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id, undefined, { numeric: true })
}

/**
 * A log reads like a feed — the latest work first. Used by the activity readers
 * (the dashboard's recent list and the TCU page's log).
 */
export function newestFirst(activities: readonly TcuActivity[]): TcuActivity[] {
  return [...activities].sort((a, b) => compareOldestFirst(b, a))
}

/**
 * An approval queue is first in, first out — the longest-waiting request leads.
 * Used by both approval queues (the dashboard card and the TCU page).
 */
export function oldestFirst(activities: readonly TcuActivity[]): TcuActivity[] {
  return [...activities].sort(compareOldestFirst)
}
