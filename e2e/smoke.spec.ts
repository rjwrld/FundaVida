import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('landing renders the hero headline and admin CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Hope changes everything.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as admin' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toBeVisible()
  })

  test('picking a role lands on the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as admin' }).first().click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /hola, admin/i })).toBeVisible()
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
