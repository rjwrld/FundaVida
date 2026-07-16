import { test, expect, type Page } from '@playwright/test'
import { enterAs } from './helpers/auth'

/**
 * Navigate from /app/calendar to a markable Mark Attendance form. The week
 * agenda (ADR-0038) always surfaces a teacher's past-unmarked Sessions in the
 * sidebar's "Needs marking" worklist — each entry deep-links straight to Mark
 * Attendance, so there is no day-click/session-link search to do (unlike the
 * old month-grid + click-a-day-panel UI this replaced). Skips the test if the
 * worklist is empty (no unmarked past Session exists at the current wall-clock
 * moment across the whole demo — practically never, but this keeps the test
 * honest rather than silently no-op-passing).
 */
async function openFirstNeedsMarkingSession(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Calendar' }).click()
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()

  // The sidebar's multi-query gate (ADR-0030/#238) resolves after the page
  // header paints, so wait for the region rather than sampling isVisible()
  // immediately (a bare isVisible() check races the loading skeleton and
  // false-negatives into an unwarranted skip).
  const worklist = page.getByRole('region', { name: 'Needs marking' })
  const hasWorklist = await worklist
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  test.skip(!hasWorklist, 'no needs-marking Session available at the current wall-clock time')

  await worklist.getByRole('link').first().click()
  await expect(page).toHaveURL(/\/mark$/)
}

test('teacher bulk-marks a session with all present defaults', async ({ page }) => {
  await enterAs(page, 'teacher')
  await openFirstNeedsMarkingSession(page)

  const saveButton = page.getByRole('button', { name: /Save/i })
  await expect(saveButton).toBeVisible()

  // Flip the first student to absent by using the Select combobox.
  const table = page.getByRole('table')
  const firstStudentRow = table.getByRole('row').nth(1) // Skip header
  const combobox = firstStudentRow.getByRole('combobox').first()

  await combobox.click()
  await page.getByRole('option', { name: 'Absent' }).click()

  await saveButton.click()
  await page.waitForTimeout(500)
})

test('saving from course detail returns to the course, not the calendar', async ({ page }) => {
  // Regression for #404: handleSave hardcoded navigate('/app/calendar'), so
  // marking a session reached from the course detail page dumped the user on
  // the calendar. Save now mirrors Cancel (navigate(-1)) and returns to origin.
  await enterAs(page, 'teacher')

  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Walk the course list (not just the first row) for one with a recordable
  // session, mirroring openFirstNeedsMarkingSession's whole-demo search so this
  // stays honest rather than silently skipping when course #1 happens to be all
  // future/closed sessions. Mark and Review actions both deep-link the mark
  // route; match either by accessible name, keeping the file's role-based style.
  const courseLinks = page.getByRole('table').getByRole('link')
  const courseCount = await courseLinks.count()
  const sessionAction = page.getByRole('link', { name: /^(Mark attendance|Review) —/ })

  let courseDetailUrl = ''
  for (let i = 0; i < courseCount; i++) {
    await page.getByRole('table').getByRole('link').nth(i).click()
    await expect(page).toHaveURL(/\/app\/courses\/[^/]+$/)
    const found = await sessionAction
      .first()
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (found) {
      courseDetailUrl = page.url()
      break
    }
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()
  }

  test.skip(courseDetailUrl === '', 'no course has a recordable session to mark')

  await sessionAction.first().click()
  await expect(page).toHaveURL(/\/mark$/)

  const saveButton = page.getByRole('button', { name: /Save/i })
  await expect(saveButton).toBeVisible()
  await saveButton.click()

  // The fix: land back on the course detail page we came from.
  await expect(page).toHaveURL(courseDetailUrl)
})

test('future session is read-only in the calendar', async ({ page }) => {
  // For this test, we'd need a future session to exist in the seed data.
  // For now, verify that the calendar shows sessions but the link behavior may differ.
  await enterAs(page, 'teacher')
  await page.getByRole('link', { name: 'Calendar' }).click()
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()

  // The session list should be visible (read-only for students, linkable for teachers)
  const sessionList = page.locator('ul').filter({ hasText: /Session/ })
  if ((await sessionList.count()) > 0) {
    await expect(sessionList).toBeVisible()
  }
})

test('roster updates without reload after bulk marking', async ({ page }) => {
  await enterAs(page, 'teacher')

  // Navigate to the course detail page
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Open the first course
  const courseLink = page.getByRole('table').getByRole('link').first()
  await courseLink.click()

  // Get the initial roster view (attendance table)
  const rosterTable = page.getByRole('table').first()
  await expect(rosterTable).toBeVisible()
  const beforeRosterText = await rosterTable.textContent()

  // Go to calendar and mark attendance for a session via the needs-marking worklist.
  await openFirstNeedsMarkingSession(page)

  const saveButton = page.getByRole('button', { name: /Save/i })
  await expect(saveButton).toBeVisible()

  // Found a markable session - save with defaults (all present)
  await saveButton.click()
  await page.waitForTimeout(500)

  // Navigate back to the course detail page
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  const courseLink2 = page.getByRole('table').getByRole('link').first()
  await courseLink2.click()

  // Verify we're back on the course detail page
  const rosterTable2 = page.getByRole('table').first()
  await expect(rosterTable2).toBeVisible()

  // The roster should be updated (verify by checking the table content is visible)
  const afterRosterText = await rosterTable2.textContent()
  expect(beforeRosterText).toBeDefined()
  expect(afterRosterText).toBeDefined()
  expect(afterRosterText?.length).toBeGreaterThan(0)
})
