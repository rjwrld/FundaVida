import { test, expect } from '@playwright/test'

test.describe('i18n', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
  })

  test('landing starts in English when no preference set', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
    await expect(page.getByText(/Educational management platform demo/)).toBeVisible()
  })

  test('toggling to ES on landing renders Spanish copy and persists', async ({ page }) => {
    await page.getByRole('button', { name: 'es' }).click()
    await expect(page.getByText(/Demostración de plataforma/)).toBeVisible()

    await page.reload()
    await expect(page.getByText(/Demostración de plataforma/)).toBeVisible()
  })

  test('locale persists from landing into app shell', async ({ page }) => {
    await page.getByRole('button', { name: 'es' }).click()
    await page.getByRole('button', { name: /Ingresar como Administrador/ }).click()

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()
  })

  test('header toggle switches locale inside the app and survives reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter as Admin' }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('link', { name: 'Students' })).toBeVisible()

    await page.getByRole('button', { name: 'es' }).click()
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()
  })
})
