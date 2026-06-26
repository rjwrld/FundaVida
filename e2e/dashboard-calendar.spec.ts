import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

// The role-scoped calendar now lives on every non-admin dashboard (ADR-0013). The
// aside collapses below the xl breakpoint, so use a wide viewport. This is the
// dashboard-wiring path that unit tests can't fully exercise (per CLAUDE.md).
test('teacher dashboard shows an interactive role-scoped calendar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterAs(page, 'teacher')

  const calendar = page.getByRole('complementary', { name: 'Calendar' })
  await expect(calendar).toBeVisible()

  // A session day is marked with data-has-event; clicking it lists that day's sessions.
  const eventDay = calendar.locator('button[data-has-event="true"]').first()
  await expect(eventDay).toBeVisible()
  await eventDay.click()

  // Teacher entries link into the course's attendance (linkSessions = true).
  const entry = calendar.getByRole('listitem').first()
  await expect(entry).toBeVisible()
  await expect(calendar.getByRole('link').first()).toHaveAttribute(
    'href',
    /\/app\/attendance\?courseId=/
  )
})

test('student dashboard calendar lists read-only sessions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterAs(page, 'student')

  const calendar = page.getByRole('complementary', { name: 'Calendar' })
  await expect(calendar).toBeVisible()

  const eventDay = calendar.locator('button[data-has-event="true"]').first()
  await expect(eventDay).toBeVisible()
  await eventDay.click()

  // A student's entries are read-only — sessions list, but no attendance links (ADR-0012).
  await expect(calendar.getByRole('listitem').first()).toBeVisible()
  await expect(calendar.getByRole('link')).toHaveCount(0)
})
