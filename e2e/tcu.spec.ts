import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

// The TCU approver is the Teacher who owns the volunteer's assigned Course
// (ADR-0017). Derive that owner from the seed (deterministic under faker.seed(42))
// rather than hardcoding it, so the spec follows seed changes.
const tcuSnapshot = seedDemo(new Date())
const tcuTrainee = tcuSnapshot.tcuTrainees.find((t) => t.id === 'tcu-1')
if (!tcuTrainee) throw new Error('seed must include tcu-1')
const tcuCourse = tcuSnapshot.courses.find((c) => c.id === tcuTrainee.courseId)
if (!tcuCourse) throw new Error(`seed must include the trainee's course ${tcuTrainee.courseId}`)
const TCU_COURSE_OWNER_ID = tcuCourse.teacherId

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
  await page.getByRole('radio', { name: 'es' }).click()
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
  await page.waitForTimeout(1000) // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Log an activity' })).toBeHidden()

  // Verify the activity appears in the table with pending status
  await expect(page.getByText(activityTitle)).toBeVisible()
  const volunteerActivityRow = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(volunteerActivityRow.getByText('Pending')).toBeVisible()

  // Switch to the teacher who OWNS the volunteer's assigned course. The role
  // switcher only maps teacher→tea-1, so seed the specific owner (derived from
  // the seed above) directly.
  await page.evaluate((ownerId) => {
    window.localStorage.setItem('fundavida:v2:role', 'teacher')
    window.localStorage.setItem('fundavida:v2:current-user', ownerId)
  }, TCU_COURSE_OWNER_ID)
  await page.goto('/app')

  // Wait for the page to fully load
  await page.waitForLoadState('networkidle')

  // Teacher dashboard should show the approval queue widget with the pending activity
  await expect(page.getByRole('heading', { name: /approval queue/i })).toBeVisible()
  const approvalQueueRow = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(approvalQueueRow).toBeVisible()

  // Click the Approve button in the approval queue
  await approvalQueueRow.getByRole('button', { name: 'Approve' }).click()

  // Wait for success toast
  await expect(page.getByText('Activity approved')).toBeVisible()
})
