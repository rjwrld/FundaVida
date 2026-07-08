import type { Page } from '@playwright/test'
import { seedDemo } from '../../src/data/seed'
// Import the ONE source of truth (ADR-0039) instead of hand-mirroring it: a
// mirror that lags the app's bump makes the pin a silent no-op (worse: old
// versions are in the legacy purge list, so the injected snapshot is actively
// deleted at boot and the app seeds at wall-time instead of the pinned epoch).
import { STATE_KEY } from '../../src/data/persistence'

/**
 * Pin the Demo Epoch for an e2e run (ADR-0014). Runs an init script — before any
 * app script loads — that seeds localStorage with a deterministic snapshot
 * anchored to `epoch`, so the store hydrates from it instead of seeding fresh at
 * real wall-time. With business time frozen, `clock.now()` / `clock.today()` are
 * deterministic and the exact-date assertions ADR-0002 forbade become valid.
 *
 * Call before `page.goto()`. Compose with `enterAs()` to also pin a role.
 */
export async function pinDemoEpoch(page: Page, epoch: Date): Promise<void> {
  const snapshot = JSON.stringify(seedDemo(epoch))
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: STATE_KEY, value: snapshot }
  )
}
