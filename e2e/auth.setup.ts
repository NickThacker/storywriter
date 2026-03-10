import { test as setup, expect } from '@playwright/test'

const E2E_EMAIL = process.env.E2E_EMAIL!
const E2E_PASSWORD = process.env.E2E_PASSWORD!

setup('authenticate', async ({ page }) => {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error('Set E2E_EMAIL and E2E_PASSWORD env vars for E2E tests')
  }

  await page.goto('/login')
  await page.locator('#signin-email').fill(E2E_EMAIL)
  await page.locator('#signin-password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // Save auth state for reuse
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
