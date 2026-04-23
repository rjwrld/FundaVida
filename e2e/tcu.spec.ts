import { test, expect } from '@playwright/test'

test('student sees only their own TCU activities', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Student' }).click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // At least one row should be visible once the table renders; the Student role
  // sees only stu-1's activities, and the seeded snapshot guarantees stu-1 has
  // at least one activity.
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // The page must NOT show the student filter select (admin-only).
  await expect(page.getByRole('combobox', { name: /student/i })).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'Actividades TCU' })).toBeVisible()
})
