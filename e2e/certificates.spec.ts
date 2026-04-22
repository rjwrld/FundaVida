import { test, expect } from '@playwright/test'

test('admin previews and downloads a certificate', async ({ page }) => {
  // Seed data already contains passing grades — at least one certificate is eligible.
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()

  await page.getByRole('button', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()

  // Capture the PDF download event
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^certificate-.*\.pdf$/)
})
