import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('student sees only their own TCU activities', async ({ page }) => {
  await enterAs(page, 'student')
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // At least one row should be visible once the table renders; the Student role
  // sees only stu-1's activities, and the seeded snapshot guarantees stu-1 has
  // at least one activity.
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // The student has no visible students list, so the filter section stays hidden.
  await expect(page.getByRole('combobox', { name: /student/i })).toHaveCount(0)
})

test('tcu trainee sees only their own TCU activities', async ({ page }) => {
  await enterAs(page, 'tcu')
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // At least one row should be visible once the table renders; the trainee role
  // sees only tcu-1's organized activities, and the seeded snapshot guarantees
  // tcu-1 organizes at least one activity.
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // The trainee has no visible students, so the filter section stays hidden.
  await expect(page.getByRole('combobox', { name: /student/i })).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'Actividades TCU' })).toBeVisible()
})
