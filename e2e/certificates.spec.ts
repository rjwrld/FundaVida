import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

async function openCertificatePreview(page: import('@playwright/test').Page) {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Certificates' }).click()
  await page.getByRole('button', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()
}

test('shows the whole certificate, footer included, on a short window', async ({ page }) => {
  // A short viewport used to clip the certificate's lower half with no way to scroll.
  await page.setViewportSize({ width: 1000, height: 560 })
  await openCertificatePreview(page)

  // The ISSUED / PROGRAM footer is the last block; if it is fully in the viewport,
  // the certificate scaled to fit the short window instead of being clipped.
  await expect(page.getByRole('dialog').getByText('PROGRAM', { exact: true })).toBeInViewport({
    ratio: 1,
  })
})

test('lets you scroll to the footer when the window is too short to scale it', async ({ page }) => {
  // Below the readable floor the certificate stops shrinking, so the preview must
  // scroll rather than clip the footer away.
  await page.setViewportSize({ width: 1000, height: 340 })
  await openCertificatePreview(page)

  const footer = page.getByRole('dialog').getByText('PROGRAM', { exact: true })
  await expect(footer).not.toBeInViewport() // starts out below the fold…
  await footer.scrollIntoViewIfNeeded()
  await expect(footer).toBeInViewport() // …and is reachable by scrolling
})

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

  // Wait for the specific download the button produces, named from the anchor's
  // `download` attribute.
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
