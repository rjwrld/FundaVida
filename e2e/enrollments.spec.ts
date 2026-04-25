import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Enrollments' }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Open menu' }).first()).toBeVisible()
  page.once('dialog', (d) => d.accept())
  const initialRows = await page.getByRole('row').count()
  await page.getByRole('button', { name: 'Open menu' }).first().click()
  await page.getByRole('menuitem', { name: 'Unenroll' }).click()

  await expect.poll(async () => page.getByRole('row').count()).toBeLessThan(initialRows)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'Matrículas' }).click()
  await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir menú' }).first()).toBeVisible()
})
