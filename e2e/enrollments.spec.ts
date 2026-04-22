import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Enrollments' }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  page.once('dialog', (d) => d.accept())
  await expect(page.getByRole('button', { name: 'Unenroll' }).first()).toBeVisible()
  const initialRows = await page.getByRole('row').count()
  await page.getByRole('button', { name: 'Unenroll' }).first().click()

  await expect.poll(async () => page.getByRole('row').count()).toBeLessThan(initialRows)
})
