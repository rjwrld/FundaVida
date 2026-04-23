import { test, expect } from '@playwright/test'

test('admin creates a teacher', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `E2E${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Teachers' }).click()
  await expect(page.getByRole('heading', { name: 'Teachers' })).toBeVisible()

  await page.getByRole('button', { name: 'Add teacher' }).click()
  await expect(page.getByRole('heading', { name: 'New teacher' })).toBeVisible()

  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Smith')
  await page.getByLabel('Email').fill(`e2e${suffix}@fv.cr`)
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: `${firstName} Smith` })).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click()
  await page.getByRole('link', { name: 'Docentes' }).click()
  await expect(page.getByRole('heading', { name: 'Docentes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar docente' })).toBeVisible()
})
