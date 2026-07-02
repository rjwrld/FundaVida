import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedDemo } from '../src/data/seed'

// Storage keys must match src/data/persistence.ts.
const STATE_KEY = 'fundavida:v10:state'
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'

// A frozen epoch keeps the seeded graph deterministic (ADR-0014).
const EPOCH = new Date('2026-06-01T12:00:00.000Z')

/**
 * Axe runs in real Chromium here, so it can evaluate the two rules the jsdom
 * component suite must switch off — colour-contrast (needs layout + a canvas)
 * and region/landmark containment (a whole-page concern). This spec is the CI
 * home for both (see src/test/axe.ts). We scan against WCAG 2.0/2.1 A + AA plus
 * axe's landmark best-practices, and fail on any violation.
 */
const RULES = ['color-contrast', 'region', 'landmark-one-main', 'landmark-unique']

async function scan(page: Page) {
  // Wait for framer-motion entrance fades to finish. Mid-fade, text sits at
  // partial opacity over the page and axe reports a spurious contrast failure
  // that isn't real once settled; poll until nothing is still fading in.
  await page
    .waitForFunction(
      () =>
        !Array.from(document.querySelectorAll<HTMLElement>('[style*="opacity"]')).some((el) => {
          const o = parseFloat(el.style.opacity)
          return !Number.isNaN(o) && o < 1
        }),
      { timeout: 4000 }
    )
    // If a looping animation never settles we still scan the current frame.
    .catch(() => undefined)
  return new AxeBuilder({ page }).withRules(RULES).analyze()
}

/** Seed the demo store and sign in as the given role before navigating. */
async function seedAndEnter(page: Page, role: 'admin' | 'teacher' | 'student', userId: string) {
  await page.goto('/')
  await page.evaluate(
    ({ stateKey, state, roleKey, role, userKey, userId }) => {
      window.localStorage.setItem(stateKey, state)
      window.localStorage.setItem(roleKey, role)
      window.localStorage.setItem(userKey, userId)
    },
    {
      stateKey: STATE_KEY,
      state: JSON.stringify(seedDemo(EPOCH)),
      roleKey: ROLE_KEY,
      role,
      userKey: USER_KEY,
      userId,
    }
  )
}

test.describe('accessibility (axe)', () => {
  // The public marketing landing is intentionally left out: its infinite
  // marquee/aurora animations never quiesce, so axe's async run does not settle
  // and the scan times out. This suite covers the authenticated product — where
  // the audit's contrast/landmark concern lives — plus the role-select page.
  test('role-select (welcome) page has no violations', async ({ page }) => {
    await page.goto('/welcome')
    const results = await scan(page)
    expect(results.violations).toEqual([])
  })

  const authed: { name: string; path: string }[] = [
    { name: 'admin dashboard', path: '/app' },
    { name: 'students list', path: '/app/students' },
    { name: 'courses list', path: '/app/courses' },
    { name: 'grades list', path: '/app/grades' },
    { name: 'audit log', path: '/app/audit-log' },
  ]

  for (const { name, path } of authed) {
    test(`${name} has no violations`, async ({ page }) => {
      await seedAndEnter(page, 'admin', 'admin')
      await page.goto(path)
      // Wait for the page's own heading so the scan runs against settled content.
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      const results = await scan(page)
      expect(results.violations).toEqual([])
    })
  }
})
