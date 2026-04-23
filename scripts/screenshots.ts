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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const SHOTS_DIR = join(PUBLIC, 'screenshots')
const DEV_PORT = 5173
const DEV_URL = `http://localhost:${DEV_PORT}`

type Locale = 'en' | 'es'

interface Shot {
  name: string
  path: string
  width: number
  height: number
  locales: Locale[]
  capture: (page: Page) => Promise<void>
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
    name: 'reports',
    path: '/app/reports',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
    },
  },
]

async function startDevServer(): Promise<ChildProcess> {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, PORT: String(DEV_PORT) },
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
  const localeButton = page.getByRole('button', { name: locale, exact: true })
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
  await enterAsAdmin(page, locale)
  await page.goto(`${DEV_URL}${shot.path}`)
  await shot.capture(page)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`wrote ${filename}`)
}

async function captureOgImage(page: Page) {
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
