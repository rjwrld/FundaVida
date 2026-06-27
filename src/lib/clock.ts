import { startOfDay } from 'date-fns'

/**
 * The clock seam: the sole authority for business "now" (ADR-0014). Every
 * read of "now" derives from a frozen Demo Epoch plus an offset, never from a
 * live `new Date()` — so seeded and live records share one timeline that never
 * decays. Real wall-time is captured only by `seedDemo` / `resetDemo`, which
 * push the epoch here via `setDemoEpoch`.
 *
 * The seam is `epoch + offset`: `offset` is `0` today (we ship frozen), so a
 * later date-travel feature only has to make `offset` settable — `now()` /
 * `today()` do not change.
 */
let epochMs = 0
let offsetMs = 0

export const clock = {
  /** The frozen instant: `demoEpoch + offset`. */
  now: (): Date => new Date(epochMs + offsetMs),
  /** Local-midnight start-of-day of `now()`, for the same-day comparisons ADR-0004 mandates. */
  today: (): Date => startOfDay(clock.now()),
}

/**
 * Hydrate the clock from a persisted `(demoEpoch, offset)`. Called by the store
 * on boot, seed, and reset; also the documented way unit tests pin a fixed
 * epoch (`setDemoEpoch(new Date('2026-…'))`). The `offset` defaults to `0`.
 */
export function setDemoEpoch(epoch: string | Date, offset = 0): void {
  epochMs = (typeof epoch === 'string' ? new Date(epoch) : epoch).getTime()
  offsetMs = offset
}
