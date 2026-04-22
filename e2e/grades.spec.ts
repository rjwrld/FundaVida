import { test, expect } from '@playwright/test'

test('admin edits a grade score', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Grades' }).click()
  await expect(page.getByRole('heading', { name: 'Grades' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).first().click()
  await expect(page.getByRole('heading', { name: 'Edit grade' })).toBeVisible()

  await page.getByLabel('Score').fill('42')
  await page.getByRole('button', { name: 'Save grade' }).click()

  await expect(page.getByRole('heading', { name: 'Edit grade' })).toBeHidden()
  await expect(page.getByRole('cell', { name: '42' }).first()).toBeVisible()
})
