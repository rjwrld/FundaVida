import { test, expect } from '@playwright/test'

test('admin previews and downloads a certificate', async ({ page }) => {
  // Seed data already contains passing grades — at least one certificate is eligible.
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()

  await page.getByRole('button', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()

  // Wait for the async PDF blob to resolve before clicking
  const downloadBtn = page.getByRole('button', { name: 'Download PDF' })
  await expect(downloadBtn).not.toHaveAttribute('aria-disabled', 'true')

  // Capture the PDF download event
  const downloadPromise = page.waitForEvent('download')
  await downloadBtn.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^certificate-.*\.pdf$/)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Certificados' }).click()
  await expect(page.getByRole('heading', { name: 'Certificados' })).toBeVisible()
})
