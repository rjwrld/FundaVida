import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'

// Business time is pinned (ADR-0014) so the persona's owned, live cohort is exact.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

// The teacher persona (tea-1) owns a published cohort — the "Message the class"
// runway (ADR-0041). Derived from the seed, not hand-guessed.
const teacherCourse = world.courses.find((c) => c.teacherId === 'tea-1' && c.status === 'published')
if (!teacherCourse) throw new Error('seed must give the teacher persona a published course')

test('admin sends a bulk email and sees it in the history', async ({ page }) => {
  const suffix = Date.now()
  const subject = `E2E ${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Bulk Email' }).click()
  await expect(page.getByRole('heading', { name: 'Bulk email' })).toBeVisible()

  await page.getByLabel('Subject').fill(subject)
  await page
    .getByLabel('Body')
    .fill('This is an automated test body message for the bulk email demo flow.')

  // Default filter is "All students" — recipients count should be > 0.
  await expect(page.getByText(/\d+ recipient/)).toBeVisible()

  await page.getByRole('button', { name: 'Send' }).click()

  // Newly-sent campaign appears in the Sent campaigns table.
  await expect(page.getByRole('cell', { name: subject })).toBeVisible()
})

test('a teacher messages their own class from the Course, choosing an audience', async ({
  page,
}) => {
  const subject = `Class ${Date.now()}`
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${teacherCourse.id}`)

  // The owning Teacher gets the write surface (never the admin-only Bulk Email nav).
  await expect(page.getByRole('link', { name: 'Bulk Email' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Message the class' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/no email leaves the browser/i)).toBeVisible()
  // Locked to the Course: no broad recipient filter, but an audience choice.
  await expect(dialog.getByText('Recipient filter')).toHaveCount(0)

  await dialog.getByLabel('Subject').fill(subject)
  await dialog.getByLabel('Body').fill('A note to the whole class about this week and materials.')

  // Pick the "both" audience (students + encargados).
  await dialog.getByLabel('Audience').click()
  await page.getByRole('option', { name: 'Students & encargados' }).click()
  await expect(dialog.getByText(/\d+ recipient/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Send' }).click()

  // The simulated send closes the dialog and toasts success.
  await expect(page.getByText('Campaign sent successfully.')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Correos masivos' }).click()
  await expect(page.getByRole('heading', { name: 'Correos masivos' })).toBeVisible()
})
