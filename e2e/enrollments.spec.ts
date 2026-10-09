import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Enrollments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  // The page opens on the pending requests (ADR-0051); approved rows carry
  // Unenroll, whose accessible name is "Delete {name}" via aria-label.
  await page.getByRole('combobox', { name: 'Filter by status' }).click()
  await page.getByRole('option', { name: 'Approved' }).click()

  const rowUnenroll = page.getByRole('button', { name: /^Delete / })
  await expect(rowUnenroll.first()).toBeVisible()
  // The table pages, so a removed row is backfilled: follow the clicked name.
  const label = (await rowUnenroll.first().getAttribute('aria-label')) ?? ''
  const sameName = page.getByRole('button', { name: label, exact: true })
  const initialCount = await sameName.count()
  await rowUnenroll.first().click()
  // Styled confirmation modal — confirm with the "Unenroll" action.
  await page.getByRole('button', { name: 'Unenroll' }).click()

  await expect.poll(async () => sameName.count()).toBeLessThan(initialCount)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Español' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Matrículas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible()
  // Opens on the pending requests, each decided in place.
  await expect(page.getByRole('button', { name: /^Aprobar / }).first()).toBeVisible()
})
