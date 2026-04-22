import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('home renders heading and CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View repository' })).toBeVisible()
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
