/**
 * Deterministic screenshot pipeline for README + landing + OG image.
 *
 * Launches a dev server, navigates to known flows in both locales, and writes
 * PNGs to public/screenshots/ + public/og-image.png.
 *
 * Run: `npm run screenshots`
 */
import { chromium, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { resolvePort } from './ports'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const SHOTS_DIR = join(PUBLIC, 'screenshots')
// Anchored to ROOT so the port is the worktree's regardless of where this script
// was invoked from (scripts/ports.ts); it is handed to the server explicitly.
const DEV_PORT = resolvePort(5173, ROOT)
const DEV_URL = `http://localhost:${DEV_PORT}`

type Locale = 'en' | 'es'

interface Shot {
  name: string
  /**
   * The route to land on before `capture` runs. Omitted for shots whose
   * `capture` navigates itself (e.g. click-through to a course detail whose id
   * is only known at runtime).
   */
  path?: string
  width: number
  height: number
  locales: Locale[]
  /** Emulated color scheme; the app's `system` theme resolves against it. */
  theme?: 'light' | 'dark'
  capture: (page: Page) => Promise<void>
}

/**
 * Navigates to the first course carrying a markable/recordable session and
 * returns its `/mark` href. The course id and session date are seed-derived, so
 * we discover them by walking the courses list rather than hard-coding ids that
 * would drift on the next reseed.
 */
async function markSessionHref(page: Page): Promise<string> {
  await page.goto(`${DEV_URL}/app/courses`)
  await page.waitForLoadState('networkidle')
  const courseHrefs: string[] = await page
    .locator('a[href^="/app/courses/"]:not([href$="/browse"])')
    .evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => el.getAttribute('href') ?? '')
            .filter((href) => href && !href.includes('/sessions/'))
        )
      )
    )
  for (const href of courseHrefs) {
    await page.goto(`${DEV_URL}${href}`)
    await page.waitForLoadState('networkidle')
    const marks = page.locator('a[href*="/sessions/"][href*="/mark"]')
    if ((await marks.count()) > 0) {
      const markHref = await marks.first().getAttribute('href')
      if (markHref) return markHref
    }
  }
  throw new Error('no course with a markable session found in the seed')
}

const SHOTS: Shot[] = [
  {
    name: 'hero',
    path: '/app',
    width: 1440,
    height: 900,
    locales: ['en'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
    },
  },
  {
    name: 'students',
    path: '/app/students',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
    },
  },
  {
    name: 'certificate',
    path: '/app/certificates',
    width: 1200,
    height: 800,
    locales: ['en', 'es'],
    capture: async (page) => {
      const previewButton = page.getByRole('button', { name: /preview|vista previa/i }).first()
      await previewButton.click()
      await page
        .getByRole('heading', {
          name: /certificate preview|vista previa del certificado/i,
        })
        .waitFor()
      // PDFViewer embeds a PDF via an iframe. We launch real Chrome (stable
      // channel) instead of Playwright's bundled Chromium so the PDF viewer
      // plugin is available and the iframe renders actual PDF content. Give
      // React + the plugin time to paint.
      await delay(2000)
    },
  },
  {
    name: 'calendar',
    path: '/app/calendar',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
      // The calendar opens on the Week view (ADR-0044); flip to the Month term
      // map (ADR-0048) — the surface this shot is meant to showcase.
      await page.getByRole('button', { name: /^(month|mes)$/i }).click()
      // The month term map animates its milestone glyphs in on mount; let the
      // entrance transition settle before capturing so the grid is fully painted.
      await delay(1000)
    },
  },
  {
    name: 'course',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      // The course id is seed-derived; reach a detail page by clicking the first
      // real course in the list rather than hard-coding an id that would drift.
      await page.goto(`${DEV_URL}/app/courses`)
      await page.waitForLoadState('networkidle')
      await page.locator('a[href^="/app/courses/"]:not([href$="/browse"])').first().click()
      await page.waitForURL(/\/app\/courses\/[^/]+$/)
      await page.waitForLoadState('networkidle')
      await delay(500)
    },
  },
  {
    name: 'mark-session',
    width: 1440,
    height: 900,
    locales: ['en'],
    // The one dark-mode capture in the set (ADR-0049 "both themes ship").
    theme: 'dark',
    capture: async (page) => {
      await page.goto(`${DEV_URL}${await markSessionHref(page)}`)
      await page.waitForLoadState('networkidle')
      await delay(500)
    },
  },
]

async function startDevServer(): Promise<ChildProcess> {
  // Pass the port rather than letting vite re-derive it: the stdout wait below
  // matches on this exact number. (The old `PORT` env var never did anything —
  // vite does not read it.)
  const server = spawn('npm', ['run', 'dev', '--', '--port', String(DEV_PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('dev server did not start in 30s')), 30_000)
    server.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes(`localhost:${DEV_PORT}`)) {
        clearTimeout(timeout)
        server.removeListener('error', reject)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        server.on('error', () => {})
        resolve()
      }
    })
    server.on('error', reject)
  })
  return server
}

async function enterAsAdmin(page: Page, locale: Locale) {
  // The plan calls for resetDemo() before each capture to guarantee determinism.
  // resetDemo is a browser-side Zustand action, so we can't call it from Node.
  // Clearing localStorage + reloading is equivalent: the store re-initialises
  // from the fixtures in src/data/seed/*.ts, all of which call faker.seed(42..50).
  await page.goto(DEV_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // The landing locale switch is a Radix ToggleGroup (radiogroup of radios),
  // not the plain buttons it used to be (#326 shadcn primitives port).
  const localeButton = page.getByRole('radio', { name: locale, exact: true })
  await localeButton.click()
  const enterButton = page
    .getByRole('button', {
      name: locale === 'en' ? /enter as admin/i : /ingresar como administrador/i,
    })
    .first()
  await enterButton.click()
  await page.waitForURL(/\/app/)
}

async function captureShot(page: Page, shot: Shot, locale: Locale) {
  const filename =
    shot.locales.length === 1
      ? `${shot.name}.en.png` // single-locale shots are always tagged 'en'
      : `${shot.name}.${locale}.png`
  const outPath = join(SHOTS_DIR, filename)

  await page.setViewportSize({ width: shot.width, height: shot.height })
  // Emulate the color scheme before the app mounts: the app's `system` theme
  // (the default after localStorage.clear()) resolves against this media query.
  await page.emulateMedia({ colorScheme: shot.theme ?? 'light' })
  await enterAsAdmin(page, locale)
  if (shot.path) await page.goto(`${DEV_URL}${shot.path}`)
  await shot.capture(page)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`wrote ${filename}`)
}

async function captureOgImage(page: Page) {
  // A prior shot may have emulated dark; the OG card is always the light hero.
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.goto(DEV_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('networkidle')
  const outPath = join(PUBLIC, 'og-image.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log('wrote og-image.png')
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true })

  const server = await startDevServer()
  try {
    const browser = await chromium.launch({ channel: 'chrome' })
    const context = await browser.newContext({ deviceScaleFactor: 2 })
    const page = await context.newPage()

    for (const shot of SHOTS) {
      for (const locale of shot.locales) {
        await captureShot(page, shot, locale)
      }
    }
    await captureOgImage(page)

    await browser.close()
  } finally {
    server.kill('SIGINT')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
