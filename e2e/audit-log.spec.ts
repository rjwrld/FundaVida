import { test, expect } from '@playwright/test'

test('admin sees audit log and a new create entry after making one', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `Aud${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()

  await page.getByRole('link', { name: 'Students' }).click()
  await page.getByRole('button', { name: 'New student' }).click()
  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Log')
  await page.getByLabel('Email').fill(`a${suffix}@fv.cr`)
  await page.getByLabel('Canton').fill('Central')

  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()

  await page.getByRole('button', { name: 'Create' }).click()

  await expect(page.getByRole('heading', { name: `${firstName} Log` })).toBeVisible()

  await page.getByRole('link', { name: 'Audit Logs' }).click()
  await expect(page.getByRole('heading', { name: 'Audit logs' })).toBeVisible()

  await expect(page.getByText(`Created student ${firstName} Log`).first()).toBeVisible()
})
