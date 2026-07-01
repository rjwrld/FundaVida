import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Enrollments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  // Wait for the grouped list to populate, then count the per-row Unenroll
  // actions (their accessible name is "Delete {name}" via aria-label).
  const rowUnenroll = page.getByRole('button', { name: /^Delete / })
  await expect(rowUnenroll.first()).toBeVisible()
  const initialCount = await rowUnenroll.count()
  await rowUnenroll.first().click()
  // Styled confirmation modal — confirm with the "Unenroll" action.
  await page.getByRole('button', { name: 'Unenroll' }).click()

  await expect.poll(async () => rowUnenroll.count()).toBeLessThan(initialCount)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Matrículas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Eliminar / }).first()).toBeVisible()
})
