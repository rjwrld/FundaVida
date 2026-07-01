import { test, expect } from '@playwright/test'

test('admin sees audit log and a new create entry after making one', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `Aud${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()

  await page.getByRole('link', { name: 'Students', exact: true }).click()
  await page.getByRole('button', { name: 'Add student' }).click()
  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Log')
  await page.getByLabel('Email', { exact: true }).fill(`a${suffix}@fv.cr`)

  // Province first, then canton (its options are scoped to the province).
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('combobox', { name: /canton/i }).click()
  await page.getByRole('option', { name: 'Escazú' }).click()

  await page.getByRole('combobox', { name: /campus/i }).click()
  await page.getByRole('option', { name: 'Linda Vista' }).click()

  // Encargado (guardian) — required.
  await page.getByLabel(/guardian name/i).fill(`${firstName} Guardian`)
  await page.getByRole('combobox', { name: /relationship/i }).click()
  await page.getByRole('option', { name: 'Mother' }).click()
  await page.getByLabel(/guardian phone/i).fill('8888-8888')
  await page.getByLabel(/guardian email/i).fill(`enc${suffix}@gmail.com`)

  await page.getByRole('button', { name: 'Save' }).click()

  // Modal closes; the audit entry below confirms the create.
  await expect(page.getByRole('heading', { name: 'New student' })).toBeHidden()

  await page.getByRole('link', { name: 'Audit Logs' }).click()
  await expect(page.getByRole('heading', { name: 'Audit logs' })).toBeVisible()

  await expect(page.getByText(`Created student ${firstName} Log`).first()).toBeVisible()
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Bitácora' }).click()
  await expect(page.getByRole('heading', { name: 'Bitácora' })).toBeVisible()
})
