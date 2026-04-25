import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('landing renders FundaVida heading and four role CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Admin' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Teacher' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Student' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as TCU' })).toBeVisible()
  })

  test('picking a role lands on the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as Admin' }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /hola, admin/i })).toBeVisible()
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
