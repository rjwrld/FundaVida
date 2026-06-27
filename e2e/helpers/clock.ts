import type { Page } from '@playwright/test'
import { seedDemo } from '../../src/data/seed'

// Must match STATE_KEY in src/data/persistence.ts (bumped to v3 by ADR-0014).
const STATE_KEY = 'fundavida:v3:state'

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
