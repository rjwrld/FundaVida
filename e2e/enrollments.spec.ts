import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Enrollments' }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  // Wait for the table to populate before counting rows.
  await expect(page.getByRole('button', { name: /^Delete / }).first()).toBeVisible()
  const initialRows = await page.getByRole('row').count()
  await page
    .getByRole('button', { name: /^Delete / })
    .first()
    .click()
  // Styled confirmation modal — confirm with the "Unenroll" action.
  await page.getByRole('button', { name: 'Unenroll' }).click()

  await expect.poll(async () => page.getByRole('row').count()).toBeLessThan(initialRows)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Matrículas' }).click()
  await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Eliminar / }).first()).toBeVisible()
})
