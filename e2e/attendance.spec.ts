import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('admin reads attendance as one row per course and opens its sessions', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Attendance' }).click()
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()

  // One rollup row per course (ADR-0051), not the per-record ledger.
  await expect(page.getByRole('columnheader', { name: 'Sessions held' })).toBeVisible()
  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow).toBeVisible()

  // The course link lands on that course's Sessions section, where marking lives.
  await firstRow.getByRole('link').click()
  await expect(page).toHaveURL(/\/app\/courses\/cou-\d+#sessions$/)
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeInViewport()
})

test('teacher has no Attendance page — marking lives on the course', async ({ page }) => {
  await enterAs(page, 'teacher')
  await expect(page.getByRole('link', { name: 'Attendance', exact: true })).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Español' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Asistencia' }).click()
  await expect(page.getByRole('heading', { name: 'Asistencia' })).toBeVisible()
})
