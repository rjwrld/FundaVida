import { test, expect } from '@playwright/test'

test('admin sees the reports bento with all chart cells', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Enrollment trend' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Attendance heatmap' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Average grade' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'TCU progress' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Certificates this month' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Top courses' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upcoming milestones' })).toBeVisible()
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Reportes' }).click()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
})
