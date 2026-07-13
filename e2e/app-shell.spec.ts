import { test, expect, type Page } from '@playwright/test'
import { enterAs } from './helpers/auth'

/**
 * The app shell on the registry Sidebar block (ADR-0047 phase 4a). Three things only a
 * real browser can answer: the nav still derives from the permission matrix after a live
 * role switch, the collapsed rail survives a reload (the block persists it as a cookie),
 * and the drawer's links actually measure ≥44px (#292) — jsdom has no layout, so the unit
 * suite can only pin the size variant.
 */

const MOBILE = { width: 390, height: 844 }

function sidebar(page: Page) {
  return page.locator('[data-slot="sidebar"]')
}

function navLink(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Navigation' }).getByRole('link', { name })
}

test.describe('app shell — sidebar nav', () => {
  test('derives the admin nav from the matrix', async ({ page }) => {
    await enterAs(page, 'admin')
    await expect(navLink(page, 'Dashboard')).toBeVisible()
    await expect(navLink(page, 'Students')).toBeVisible()
    await expect(navLink(page, 'Audit Logs')).toBeVisible()
  })

  test('derives the student nav from the matrix', async ({ page }) => {
    await enterAs(page, 'student')
    await expect(navLink(page, 'Courses')).toBeVisible()
    await expect(navLink(page, 'My profile')).toBeVisible()
    await expect(navLink(page, 'Students')).toHaveCount(0)
    await expect(navLink(page, 'Audit Logs')).toHaveCount(0)
  })

  // The TCU role is the one that derives the Program catalog away (ADR-0035).
  test('derives the tcu nav from the matrix', async ({ page }) => {
    await enterAs(page, 'tcu')
    await expect(navLink(page, 'Calendar')).toBeVisible()
    await expect(navLink(page, 'Programs')).toHaveCount(0)
    await expect(navLink(page, 'Students')).toHaveCount(0)
  })

  // The footer's role menu is the switch itself: picking a role must re-derive the visible
  // items on the spot, with no reload (ADR-0010 — the block is presentation, the matrix is truth).
  test('re-derives the nav when the role switches from the user footer', async ({ page }) => {
    await enterAs(page, 'admin')
    await expect(navLink(page, 'Students')).toBeVisible()

    await page.getByRole('button', { name: 'Admin' }).click()
    await page.getByRole('menuitem', { name: 'Student' }).click()

    await expect(navLink(page, 'My profile')).toBeVisible()
    await expect(navLink(page, 'Students')).toHaveCount(0)
  })

  test('lights the section of the current route, detail pages included', async ({ page }) => {
    await enterAs(page, 'admin')
    await navLink(page, 'Courses').click()
    await expect(page).toHaveURL(/\/app\/courses$/)
    await expect(navLink(page, 'Courses')).toHaveAttribute('data-active', 'true')
    await expect(navLink(page, 'Dashboard')).toHaveAttribute('data-active', 'false')
  })
})

test.describe('app shell — the collapsible rail', () => {
  test('collapses on the keyboard shortcut and stays collapsed across a reload', async ({
    page,
  }) => {
    await enterAs(page, 'admin')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')

    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')

    await page.reload()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')

    // …and back, so the persisted state is a real toggle and not a one-way door.
    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')
    await page.reload()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')
  })

  // Collapsed, the rail is icons only — the labels move into tooltips, so the links must
  // keep their accessible names or the nav becomes unusable for assistive tech.
  test('keeps the nav reachable by name when collapsed to the icon rail', async ({ page }) => {
    await enterAs(page, 'admin')
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')

    await expect(navLink(page, 'Courses')).toBeVisible()
    await navLink(page, 'Courses').click()
    await expect(page).toHaveURL(/\/app\/courses$/)
  })

  // Collapsing must not strand the keyboard: the trigger the user just pressed keeps focus,
  // so the next Tab continues from the chrome instead of restarting at the document.
  test('leaves focus on the trigger after collapsing', async ({ page }) => {
    await enterAs(page, 'admin')
    const trigger = page.getByRole('button', { name: 'Toggle navigation' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')
    await expect(trigger).toBeFocused()
  })
})

test.describe('app shell — the mobile drawer', () => {
  test.use({ viewport: MOBILE })

  test('opens from the header trigger and closes on a nav link', async ({ page }) => {
    await enterAs(page, 'admin')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByRole('link', { name: 'FundaVida' })).toBeVisible()

    await drawer.getByRole('link', { name: 'Courses' }).click()
    await expect(page).toHaveURL(/\/app\/courses$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  // #292, closed here as a criterion: every link in the drawer clears the ~44px touch
  // minimum (Apple HIG / WCAG 2.5.8). The desktop rail keeps its own denser size.
  test('gives every drawer nav link a ≥44px touch target', async ({ page }) => {
    await enterAs(page, 'admin')
    await page.getByRole('button', { name: 'Toggle navigation' }).click()

    const links = page.getByRole('dialog').getByRole('link')
    const count = await links.count()
    expect(count).toBeGreaterThan(5)

    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      const name = await link.textContent()
      const box = await link.boundingBox()
      expect(box, `link ${name} should be laid out`).not.toBeNull()
      // The brand lockup is a link in this row too, but it is not a nav destination.
      if (name?.trim() === 'FundaVida') continue
      expect.soft(box?.height, `nav link ${name} touch target`).toBeGreaterThanOrEqual(44)
    }
  })

  test('closes the drawer from its brand-row close button', async ({ page }) => {
    await enterAs(page, 'admin')
    await page.getByRole('button', { name: 'Toggle navigation' }).click()

    const drawer = page.getByRole('dialog')
    await drawer.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  // The drawer carries the nav landmark too — the block drops props handed to `<Sidebar>`
  // on this surface (Radix's Dialog root keeps only the props it knows), so this is the
  // assertion that the landmark lives somewhere both surfaces actually render.
  test('exposes the nav landmark inside the drawer, and closes on Escape', async ({ page }) => {
    await enterAs(page, 'admin')
    await page.getByRole('button', { name: 'Toggle navigation' }).click()

    const nav = page.getByRole('dialog').getByRole('navigation', { name: 'Navigation' })
    await expect(nav.getByRole('link', { name: 'Courses' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
