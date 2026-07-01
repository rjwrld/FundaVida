import { test, expect } from '@playwright/test'
import { seedDemo } from '../src/data/seed'

// A published Linda Vista / primaria cohort — matches the new student the chain
// creates (campus Linda Vista, default level primaria), so they are enroll-eligible,
// and it is published so the chain can close it to emit the Certificate (ADR-0024).
const world = seedDemo(new Date())
const chainCourse = world.courses.find(
  (c) => c.status === 'published' && c.sede === 'Linda Vista' && c.level === 'primaria'
)
if (!chainCourse) throw new Error('seed has no published Linda Vista primaria course')

test('admin runs the full chain: create student, enroll, grade, close, certificate', async ({
  page,
}) => {
  const suffix = Date.now()
  const firstName = `E2EChain${suffix}`
  const lastName = 'Tester'
  const fullName = `${firstName} ${lastName}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()

  await page.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()
  await page.getByRole('button', { name: 'Add student' }).click()
  await expect(page.getByRole('heading', { name: 'New student' })).toBeVisible()

  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill(lastName)
  await page.getByLabel('Email', { exact: true }).fill(`e2e+${suffix}@example.com`)
  // Province first, then canton (its options are scoped to the province).
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('combobox', { name: /canton/i }).click()
  await page.getByRole('option', { name: 'Escazú' }).click()
  await page.getByRole('combobox', { name: /campus/i }).click()
  await page.getByRole('option', { name: 'Linda Vista' }).click()
  // Encargado (guardian) — required.
  await page.getByLabel(/guardian name/i).fill(`${firstName} Guardian`)
  await page.getByRole('combobox', { name: /relationship/i }).click()
  await page.getByRole('option', { name: 'Mother' }).click()
  await page.getByLabel(/guardian phone/i).fill('8888-8888')
  await page.getByLabel(/guardian email/i).fill(`enc+${suffix}@gmail.com`)
  await page.getByRole('button', { name: 'Save' }).click()

  // Modal closes; the student now exists (selected via the Enroll dialog below).
  await expect(page.getByRole('heading', { name: 'New student' })).toBeHidden()

  // Navigate via the SPA (not page.goto) so the just-created student stays in the
  // in-memory store — a full reload could race the debounced localStorage flush.
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()
  // The course link renders in both the desktop table and the display:none mobile
  // card; :visible picks the table one so strict mode sees a single match.
  await page.locator(`a[href$="/courses/${chainCourse.id}"]:visible`).click()

  await page.getByRole('button', { name: 'Enroll student' }).click()
  await expect(page.getByRole('heading', { name: 'Enroll student' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Student' }).click()
  await page.getByRole('option', { name: fullName }).click()
  await page.getByRole('button', { name: 'Enroll', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enroll student' })).toBeHidden()

  const studentRow = page.getByRole('row').filter({ hasText: fullName })
  await expect(studentRow).toBeVisible()

  await studentRow.getByRole('button', { name: 'Grade' }).click()
  await expect(page.getByRole('heading', { name: `Grade ${fullName}` })).toBeVisible()
  await page.getByLabel('Score').fill('95')
  await page.getByRole('button', { name: 'Save grade' }).click()
  await expect(page.getByRole('heading', { name: `Grade ${fullName}` })).toBeHidden()

  await expect(page.getByRole('row').filter({ hasText: fullName })).toContainText('95')

  // Closing the Course emits a downloadable Certificate for every passing Student,
  // all at once (ADR-0024) — there is no separate approval step.
  await page.getByRole('button', { name: 'Close course' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close course' }).click()

  // The new student's Certificate now appears in the in-course Certificates section,
  // immediately downloadable; the Close action is gone (the cohort is closed).
  const certCard = page.getByRole('button', {
    name: new RegExp(`Open preview for ${firstName}`, 'i'),
  })
  await expect(certCard).toBeVisible()
  await expect(certCard).toContainText('95')
  await expect(page.getByRole('button', { name: 'Close course' })).toHaveCount(0)
})
