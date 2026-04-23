import { test, expect } from '@playwright/test'

test('admin sees report cards and section tables', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  await expect(page.getByText('Students', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Teachers', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Courses', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Enrollments', { exact: true }).first()).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Enrollments by course' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Average grade by course' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Attendance rate by course' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'TCU hours by student' })).toBeVisible()
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'Reportes' }).click()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
})
