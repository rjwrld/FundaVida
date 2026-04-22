import { test, expect } from '@playwright/test'

test('admin creates a teacher', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `E2E${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Teachers' }).click()
  await expect(page.getByRole('heading', { name: 'Teachers' })).toBeVisible()

  await page.getByRole('button', { name: 'New teacher' }).click()
  await expect(page.getByRole('heading', { name: 'New teacher' })).toBeVisible()

  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Smith')
  await page.getByLabel('Email').fill(`e2e${suffix}@fv.cr`)
  await page.getByRole('button', { name: 'Create teacher' }).click()

  await expect(page.getByRole('heading', { name: `${firstName} Smith` })).toBeVisible()
})
