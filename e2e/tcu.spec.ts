import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { fullName } from '../src/lib/personName'

// The TCU approver is the Teacher who owns the volunteer's assigned Course
// (ADR-0017). Derive that owner from the seed (deterministic under faker.seed(42))
// rather than hardcoding it, so the spec follows seed changes.
const tcuSnapshot = seedDemo(new Date())
const tcuTrainee = tcuSnapshot.tcuTrainees.find((t) => t.id === 'tcu-1')
if (!tcuTrainee) throw new Error('seed must include tcu-1')
const tcuCourse = tcuSnapshot.courses.find((c) => c.id === tcuTrainee.courseId)
if (!tcuCourse) throw new Error(`seed must include the trainee's course ${tcuTrainee.courseId}`)
const TCU_COURSE_OWNER_ID = tcuCourse.teacherId

test('tcu trainee works from the dashboard; the TCU page is not theirs', async ({ page }) => {
  await enterAs(page, 'tcu')

  // The dashboard is the trainee's single home (ADR-0050/0051): no TCU nav item,
  // and a deep link to /app/tcu lands back on the dashboard.
  await expect(page.getByRole('link', { name: 'TCU', exact: true })).toHaveCount(0)
  const log = page.getByRole('region', { name: 'My activities' })
  await expect(log.getByRole('row').nth(1)).toBeVisible()

  await page.goto('/app/tcu')
  await expect(page).toHaveURL(/\/app$/)
})

test('admin opens a trainee log from the progress roster', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'TCU', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'TCU hours to approve' })).toBeVisible()

  // No log until a trainee is selected; selecting opens theirs.
  const trainee = tcuSnapshot.tcuTrainees[0]
  if (!trainee) throw new Error('seed must include a trainee')
  const name = fullName(trainee)
  await expect(page.getByRole('heading', { name: `${name}'s activities` })).toHaveCount(0)
  await page.getByRole('button', { name: `Show only ${name}'s activities` }).click()
  await expect(page.getByRole('heading', { name: `${name}'s activities` })).toBeVisible()
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Español' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'Actividades TCU' })).toBeVisible()
})

test('volunteer logs activity (pending) and teacher approves it', async ({ page }) => {
  // Volunteer logs an activity from their dashboard (ADR-0050/0051)
  await enterAs(page, 'tcu')
  await page.getByRole('button', { name: 'Log hours' }).click()
  await expect(page.getByRole('heading', { name: 'Log an activity' })).toBeVisible()

  // Fill in the form
  const suffix = Date.now()
  const activityTitle = `E2E Test Activity ${suffix}`
  const hours = 5
  await page.getByLabel('Activity title').fill(activityTitle)
  await page.getByLabel(/^Hours \(/).fill(String(hours))
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
  await expect(page.getByRole('heading', { name: 'TCU hours to approve' })).toBeVisible()
  const approvalQueueRow = page.getByRole('row').filter({ has: page.getByText(activityTitle) })
  await expect(approvalQueueRow).toBeVisible()

  // Click the Approve button in the approval queue
  await approvalQueueRow.getByRole('button', { name: 'Approve' }).click()

  // Wait for success toast
  await expect(page.getByText('Activity approved')).toBeVisible()
})
