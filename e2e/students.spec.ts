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
  await page.getByLabel('Canton').fill('Central')

  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()

  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  await expect(page.getByText('ada+e2e@example.com')).toBeVisible()

  await page.getByRole('button', { name: 'Back to home' }).click()
  await page.getByPlaceholder('Search by name or email').fill('Ada')
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Estudiantes' }).click()
  await expect(page.getByRole('heading', { name: 'Estudiantes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar estudiante' })).toBeVisible()
})
