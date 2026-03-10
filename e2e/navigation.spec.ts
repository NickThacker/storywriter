import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('top nav links work', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/library|your library/i)).toBeVisible({ timeout: 10_000 })

    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings/)

    // Navigate back to dashboard
    await page.getByRole('link', { name: /library/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('unauthenticated user is redirected to login', async ({ browser }) => {
    // Create a fresh context with no auth state
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await context.close()
  })

  test('sign out works', async ({ browser }) => {
    // Use a separate context so we don't invalidate the shared auth
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page.getByText(/library/i)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await context.close()
  })
})
