import { test, expect } from '@playwright/test'

test('admin sends a bulk email and sees it in the history', async ({ page }) => {
  const suffix = Date.now()
  const subject = `E2E ${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
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

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'Correos masivos' }).click()
  await expect(page.getByRole('heading', { name: 'Correos masivos' })).toBeVisible()
})
