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
  await page.getByLabel('Email').fill(`e2e+${suffix}@example.com`)
  await page.getByLabel('Canton').fill('Central')
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: fullName })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()
  const certCard = page.getByRole('button', {
    name: new RegExp(`Open preview for ${firstName}`, 'i'),
  })
  await expect(certCard).toBeVisible()
  await expect(certCard).toContainText('95')
})
