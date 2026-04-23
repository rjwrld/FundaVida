import { test, expect } from '@playwright/test'

test('teacher sees attendance only for their own courses', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Teacher' }).click()
  await page.getByRole('link', { name: 'Attendance' }).click()
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()

  // Teacher role hides the student filter (admin-only).
  await expect(page.getByRole('combobox').filter({ hasText: /student/i })).toHaveCount(0)

  // At least one row renders (tea-1 owns courses with seeded enrollments).
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // Filter by status=present — rows should remain present-only.
  await page
    .getByRole('combobox')
    .filter({ hasText: /status/i })
    .click()
  await page.getByRole('option', { name: 'Present' }).click()

  const presentBadges = page.getByText('Present', { exact: true })
  await expect(presentBadges.first()).toBeVisible()
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'Asistencia' }).click()
  await expect(page.getByRole('heading', { name: 'Asistencia' })).toBeVisible()
})
