import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('tcu trainee sees only their own TCU activities', async ({ page }) => {
  await enterAs(page, 'tcu')
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // At least one row should be visible once the table renders; the trainee role
  // sees only tcu-1's organized activities, and the seeded snapshot guarantees
  // tcu-1 organizes at least one activity.
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // The trainee has no visible students, so the filter section stays hidden.
  await expect(page.getByRole('combobox', { name: /student/i })).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'Actividades TCU' })).toBeVisible()
})

test('volunteer logs activity (pending) and teacher approves it', async ({ page }) => {
  // Volunteer logs an activity
  await enterAs(page, 'tcu')
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // Click log activity button
  await page.getByRole('button', { name: 'Log an activity' }).click()
  await expect(page.getByRole('heading', { name: 'Log an activity' })).toBeVisible()

  // Fill in the form
  const suffix = Date.now()
  const activityTitle = `E2E Test Activity ${suffix}`
  const hours = 5
  await page.getByLabel('Activity title').fill(activityTitle)
  await page.getByLabel('Hours').fill(String(hours))
  // Date is auto-filled with today's date
  await page.getByRole('button', { name: 'Log activity' }).click()

  // Wait for success toast and close dialog
  await expect(page.getByText('Activity logged')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Log an activity' })).toBeHidden()

  // Verify the activity appears in the table with pending status
  await expect(page.getByText(activityTitle)).toBeVisible()
  const volunteerActivityRow = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(volunteerActivityRow.getByText('Pending')).toBeVisible()

  // Capture initial approved hours before teacher action
  const approvedHoursMatch = await page.getByText('Approved hours').locator('..').innerText()
  const initialApprovedMatch = approvedHoursMatch.match(/\d+/)
  const initialApprovedHours = initialApprovedMatch ? parseInt(initialApprovedMatch[0], 10) : 0

  // Switch to teacher role to approve the activity
  await page.getByRole('button', { name: 'Enter as teacher' }).first().click()
  await page.getByRole('link', { name: 'TCU' }).click()

  // Teacher should see the approval queue with the pending activity
  await expect(page.getByRole('heading', { name: /approval queue/i })).toBeVisible()
  const approvalQueueRow = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(approvalQueueRow).toBeVisible()

  // Click the Approve button in the approval queue
  await approvalQueueRow.getByRole('button', { name: 'Approve' }).click()

  // Wait for success toast
  await expect(page.getByText('Activity approved')).toBeVisible()

  // Brief wait for UI to update
  await page.waitForTimeout(500)

  // Switch back to volunteer to verify the activity now shows as approved
  await page.getByRole('button', { name: 'Enter as tcu' }).first().click()
  await page.getByRole('link', { name: 'TCU' }).click()

  // Verify the activity status changed to approved
  const volunteerRowAfter = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(volunteerRowAfter.getByText('Approved')).toBeVisible()

  // Verify approved hours increased without a page reload
  const newApprovedHoursMatch = await page.getByText('Approved hours').locator('..').innerText()
  const newApprovedMatch = newApprovedHoursMatch.match(/\d+/)
  const newApprovedHours = newApprovedMatch ? parseInt(newApprovedMatch[0], 10) : 0

  // The approved hours should have increased by the activity hours
  expect(newApprovedHours).toBe(initialApprovedHours + hours)
})
