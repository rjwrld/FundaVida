import { test, expect } from '@playwright/test'

test('admin creates a student and sees them in the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Students' }).click()
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()

  await page.getByRole('button', { name: 'Add student' }).click()
  await expect(page.getByRole('heading', { name: 'New student' })).toBeVisible()

  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Lovelace')
  await page.getByLabel('Email').fill('ada+e2e@example.com')

  // Province first, then canton (its options are scoped to the province).
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('combobox', { name: /canton/i }).click()
  await page.getByRole('option', { name: 'Escazú' }).click()

  await page.getByRole('combobox', { name: /campus/i }).click()
  await page.getByRole('option', { name: 'Linda Vista' }).click()

  await page.getByRole('button', { name: 'Save' }).click()

  // The modal closes and the new student shows up in the list.
  await expect(page.getByRole('heading', { name: 'New student' })).toBeHidden()
  await page.getByPlaceholder('Search by name or email').fill('Ada')
  await expect(page.getByRole('link', { name: 'Ada Lovelace' })).toBeVisible()
  await expect(page.getByText('ada+e2e@example.com')).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Estudiantes' }).click()
  await expect(page.getByRole('heading', { name: 'Estudiantes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar estudiante' })).toBeVisible()
})
