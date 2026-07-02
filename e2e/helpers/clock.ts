import type { Page } from '@playwright/test'
import { seedDemo } from '../../src/data/seed'

// MUST mirror STATE_KEY in src/data/persistence.ts — a stale version here makes
// the pin a silent no-op (worse: old versions are in its legacy purge list, so
// the injected snapshot is actively deleted at boot and the app seeds at
// wall-time instead of the pinned epoch).
const STATE_KEY = 'fundavida:v10:state'

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
