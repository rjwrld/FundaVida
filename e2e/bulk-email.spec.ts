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
  await expect(page.getByText(/\d+ recipients?\./)).toBeVisible()

  await page.getByRole('button', { name: 'Send' }).click()

  // Newly-sent campaign appears in the Past campaigns table.
  await expect(page.getByRole('cell', { name: subject })).toBeVisible()
})
