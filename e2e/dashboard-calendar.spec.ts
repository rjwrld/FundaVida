import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

// The role-scoped calendar now lives on every non-admin dashboard (ADR-0013). The
// aside collapses below the xl breakpoint, so use a wide viewport. This is the
// dashboard-wiring path that unit tests can't fully exercise (per CLAUDE.md).
async function expectInteractiveCalendar(
  page: import('@playwright/test').Page,
  role: 'teacher' | 'student'
) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterAs(page, role)

  const calendar = page.getByRole('complementary', { name: 'Calendar' })
  await expect(calendar).toBeVisible()

  // The viewer's session days are marked as events.
  await expect(calendar.locator('button[data-has-event="true"]').first()).toBeVisible()

  // The calendar is interactive: advancing the month updates the heading.
  const heading = calendar.getByRole('heading').first()
  const before = await heading.textContent()
  await calendar.getByRole('button', { name: 'Next month' }).click()
  await expect(heading).not.toHaveText(before ?? '')
}

test('teacher dashboard shows an interactive role-scoped calendar', async ({ page }) => {
  await expectInteractiveCalendar(page, 'teacher')
})

test('student dashboard shows an interactive role-scoped calendar', async ({ page }) => {
  await expectInteractiveCalendar(page, 'student')
})
