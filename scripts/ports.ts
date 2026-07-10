import { createHash } from 'node:crypto'

/**
 * Vite's dev and preview servers used to bind the same fixed ports in every
 * checkout. Because `playwright.config.ts` sets `reuseExistingServer: false`
 * under CI=1, two git worktrees running the e2e suite at once raced for one
 * port and the loser's server was torn down mid-suite.
 *
 * That failure wears a convincing disguise: a *different* set of specs fails
 * each run, every one an `ERR_CONNECTION_REFUSED` at `page.goto`, which reads
 * like a real regression in whichever spec happened to be mid-flight. Deriving
 * the port from the checkout path gives every worktree a server of its own.
 *
 * GitHub Actions keeps the base port — each job owns its runner, so there is
 * nothing to collide with, and a stable port keeps the logs readable.
 * `APP_PORT` overrides everything, for when you need a known port to attach to.
 *
 * `cwd` is a parameter rather than an ambient read because the derivation only
 * works if every process that needs the number agrees on the anchor. Callers
 * that spawn a server pass the port to it explicitly (`--port`) instead of
 * trusting it to re-derive the same value from its own cwd.
 *
 * Two worktrees can still hash into the same bucket. That is safe rather than
 * silent: `--strictPort` and Playwright's own port pre-check both refuse to
 * start on a taken port, so a collision is a loud, immediate error.
 */
export function resolvePort(basePort: number, cwd: string = process.cwd()): number {
  const override = process.env.APP_PORT
  if (override) return Number(override)
  if (process.env.GITHUB_ACTIONS) return basePort

  // 16 bits of the path digest, mod 100: deterministic per worktree, and a
  // narrow enough window that the ports stay recognisable (4174…4273).
  const offset = createHash('sha256').update(cwd).digest().readUInt16BE(0) % 100
  return basePort + 1 + offset
}

/** `vite` (dev). Playwright drives this when CI is unset. */
export const DEV_PORT = resolvePort(5173)

/** `vite preview` (built assets). Playwright drives this under CI=1. */
export const PREVIEW_PORT = resolvePort(4173)
