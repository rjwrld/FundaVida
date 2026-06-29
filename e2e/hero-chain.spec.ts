import { test, expect } from '@playwright/test'

test('admin runs the full chain: create student, enroll, grade, certificate', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `E2EChain${suffix}`
  const lastName = 'Tester'
  const fullName = `${firstName} ${lastName}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()

  await page.getByRole('link', { name: 'Students' }).click()
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

  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()
  await page.getByRole('table').getByRole('link').first().click()

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

  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates', exact: true })).toBeVisible()

  // A passing grade creates a *pending* certificate; an admin approves it from the
  // pending-first worklist's "Needs approval" tab (ADR-0019), which makes the PDF
  // available under the "Approved" tab.
  await page
    .getByRole('button', { name: new RegExp(`Approve certificate for ${firstName}`, 'i') })
    .click()

  await page.getByRole('tab', { name: 'Approved' }).click()
  const certCard = page.getByRole('button', {
    name: new RegExp(`Open preview for ${firstName}`, 'i'),
  })
  await expect(certCard).toBeVisible()
  await expect(certCard).toContainText('95')
})
