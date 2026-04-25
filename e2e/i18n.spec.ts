import { test, expect } from '@playwright/test'

test.describe('i18n', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
  })

  test('landing starts in English when no preference set', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Hope changes everything.' })).toBeVisible()
    await expect(page.getByText(/browser-only portfolio demo/)).toBeVisible()
  })

  test('toggling to ES on landing renders Spanish copy and persists', async ({ page }) => {
    await page.getByRole('button', { name: 'es' }).click()
    await expect(page.getByText(/demo de portafolio sin backend/)).toBeVisible()

    await page.reload()
    await expect(page.getByText(/demo de portafolio sin backend/)).toBeVisible()
  })

  test('new landing sections render in both locales', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Built with the same craft as production.' })
    ).toBeVisible()
    await expect(page.getByText('React 18').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'FundaVida org' })).toBeVisible()

    await page.getByRole('button', { name: 'es' }).click()

    await expect(
      page.getByRole('heading', { name: 'Construido con el mismo oficio que producción.' })
    ).toBeVisible()
    await expect(page.getByText('React 18').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Fundación FundaVida' })).toBeVisible()
  })

  test('locale persists from landing into app shell', async ({ page }) => {
    await page.getByRole('button', { name: 'es' }).click()
    await page
      .getByRole('button', { name: /Ingresar como administrador/i })
      .first()
      .click()

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()
  })

  test('header toggle switches locale inside the app and survives reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter as admin' }).first().click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('link', { name: 'Students' })).toBeVisible()

    await page.getByRole('button', { name: 'es', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: 'Estudiantes' })).toBeVisible()
  })
})
