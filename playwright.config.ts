import { defineConfig, devices } from '@playwright/test'
import { DEV_PORT, PREVIEW_PORT } from './scripts/ports'

// Ports are derived per worktree so concurrent runs never fight over one server
// (see scripts/ports.ts). Under CI=1 Playwright builds and serves the bundle;
// otherwise it drives the dev server, reusing one already on the port.
const port = process.env.CI ? PREVIEW_PORT : DEV_PORT
const baseURL = `http://localhost:${port}`

// Hand the port to the server rather than letting it re-derive one. Both sides
// would otherwise hash their own cwd, and Playwright spawns `webServer` from the
// config's directory while its own cwd is wherever you invoked it — so running
// `playwright test -c …/playwright.config.ts` from a subdirectory would poll one
// port while vite listened on another, and time out. `--strictPort` keeps a
// taken port a loud failure instead of vite quietly sliding to the next one.
const serve = process.env.CI
  ? `npm run build && npm run preview -- --port ${port} --strictPort`
  : `npm run dev -- --port ${port} --strictPort`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: serve,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
