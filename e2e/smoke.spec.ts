import { test, expect } from '@playwright/test'

test('landing renders the FundaVida heading and CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View repository' })).toBeVisible()
})
