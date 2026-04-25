import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('teacher grades a student in their course', async ({ page }) => {
  await enterAs(page, 'teacher')
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Open the first course in the list (link inside the table body)
  await page.getByRole('table').getByRole('link').first().click()

  // Click Grade on the first enrolled student
  await page.getByRole('button', { name: 'Grade' }).first().click()

  // The dialog heading reads "Grade <student name>"
  await expect(page.getByRole('heading', { name: /^Grade / })).toBeVisible()

  // Enter a score and save
  await page.getByLabel('Score').fill('92')
  await page.getByRole('button', { name: 'Save grade' }).click()

  // Score 92 now appears in the row (dialog closes first)
  await expect(page.getByRole('heading', { name: /^Grade / })).toBeHidden()
  await expect(page.getByText('92')).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Cursos' }).click()
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar curso' })).toBeVisible()
})
