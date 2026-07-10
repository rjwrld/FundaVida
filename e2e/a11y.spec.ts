import { test, expect, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedDemo } from '../src/data/seed'
import { STATE_KEY } from '../src/data/persistence'
import type { Role } from '../src/types'
import { USER_ID_FOR_ROLE } from './helpers/auth'

// Storage keys must match src/data/persistence.ts.
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'

// A frozen epoch keeps the seeded graph deterministic (ADR-0014).
const EPOCH = new Date('2026-06-01T12:00:00.000Z')

/**
 * Axe runs in real Chromium here, so it can evaluate the rules the jsdom
 * component suite must switch off — colour-contrast (needs layout + a canvas)
 * and region/landmark containment (a whole-page concern). This spec is the CI
 * home for both (see src/test/axe.ts).
 *
 * We scan the full WCAG 2.0/2.1 A + AA rule set plus axe's best-practice rules
 * (which cover the landmark/region and heading-structure checks) and fail on
 * any violation. This started as a four-rule allowlist; it was widened once the
 * pre-existing findings it surfaced were fixed (dashboard heatmap grid roles,
 * decorative funnel bars, weekday-header labels, /welcome heading level).
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

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
  return new AxeBuilder({ page }).withTags(TAGS).analyze()
}

/** Resolve once the element's colour pair has stopped changing. */
async function settleColorTransition(target: Locator) {
  const read = () =>
    target.evaluate((el) => {
      const s = getComputedStyle(el)
      return `${s.color}|${s.backgroundColor}`
    })
  await expect
    .poll(async () => {
      const before = await read()
      // 50ms, not one frame: a 150ms ease rounds to the same colour across
      // adjacent frames near its end, which would settle early.
      await new Promise((resolve) => setTimeout(resolve, 50))
      return (await read()) === before
    })
    .toBe(true)
}

/** Seed the demo store and sign in as the given role before navigating. */
async function seedAndEnter(page: Page, role: Role, userId: string) {
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

  // /app is a different surface per role — each role composes its own cards, so
  // a violation on one hides on the others. Scanning admin alone let the same
  // heading-order skip the admin StatRow fixed sit latent on the other three
  // (issue #278), so every role gets scanned.
  const roles: Role[] = ['admin', 'teacher', 'student', 'tcu']

  for (const role of roles) {
    test(`${role} dashboard has no violations`, async ({ page }) => {
      await seedAndEnter(page, role, USER_ID_FOR_ROLE[role])
      await page.goto('/app')
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      // Skeletons are the role="status" elements labelled "Loading…" (the Pager's
      // live region is one too, and it never clears). None survives a settled
      // dashboard, so waiting them out scans the loaded cards, not placeholders.
      await expect(page.locator('[role="status"][aria-label^="Loading"]')).toHaveCount(0)
      const results = await scan(page)
      expect(results.violations).toEqual([])
    })
  }

  // Admin-only list surfaces.
  const authed: { name: string; path: string }[] = [
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

  /**
   * The route scans above never hover anything, so they cannot see a hover-only
   * contrast failure. The calendar's active view toggle had one: `ghost` supplies
   * `hover:text-accent-foreground`, and the active-state override set a hover
   * background but no hover foreground, so hovering the pressed button painted
   * near-black on brand green (3.86:1).
   */
  test('the active calendar view toggle keeps AA contrast while hovered', async ({ page }) => {
    await seedAndEnter(page, 'admin', 'admin')
    await page.goto('/app/calendar')

    const activeToggle = page.getByRole('main').getByRole('button', { name: 'Week', exact: true })
    await expect(activeToggle).toHaveAttribute('aria-pressed', 'true')
    await activeToggle.hover()
    await settleColorTransition(activeToggle)

    const results = await new AxeBuilder({ page })
      .include('main button[aria-pressed="true"]')
      .withTags(['wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  // The month navigator only exists behind the Week|Month toggle, so the route
  // scans above never reach it. It is the app's only date-picker grid.
  test('calendar month navigator has no violations', async ({ page }) => {
    await seedAndEnter(page, 'admin', 'admin')
    await page.goto('/app/calendar')
    const monthToggle = page.getByRole('button', { name: 'Month', exact: true })
    await monthToggle.click()
    await expect(page.getByRole('heading', { name: 'June 2026' })).toBeVisible()
    // Unlike the route scans above, this one follows a click, so it has to wait
    // out two things the others never see: the pointer left hovering the toggle,
    // and the toggle's `transition-all` still easing its colours. axe reads a
    // half-applied colour pair as a contrast failure.
    await page.mouse.move(0, 0)
    await settleColorTransition(monthToggle)
    const results = await scan(page)
    expect(results.violations).toEqual([])
  })
})
