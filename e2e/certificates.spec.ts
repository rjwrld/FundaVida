import { test, expect } from '@playwright/test'

test('admin previews and downloads a certificate', async ({ page }) => {
  // Seed data already contains passing grades — at least one certificate is eligible.
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()

  // Wait for the async PDF blob to resolve before clicking
  const downloadBtn = page.getByRole('button', { name: 'Download PDF' })
  await expect(downloadBtn).not.toHaveAttribute('aria-disabled', 'true')

  // Capture the PDF download. The preview's <PDFViewer> loads the certificate
  // blob in an iframe, which headless Chromium emits as a *second* download
  // event with a blob-UUID filename — racing the anchor click. Wait for the
  // specific download the button produces (named from the anchor's `download`
  // attribute) so the assertion can't latch onto the preview's spurious one.
  const downloadPromise = page.waitForEvent('download', (d) =>
    /^certificate-.*\.pdf$/.test(d.suggestedFilename())
  )
  await downloadBtn.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^certificate-.*\.pdf$/)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Certificados' }).click()
  await expect(page.getByRole('heading', { name: 'Certificados', exact: true })).toBeVisible()
})
