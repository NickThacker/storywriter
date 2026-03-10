import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test('loads settings page with tabs', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 10_000 })

    // Should have the three tabs
    await expect(page.getByRole('tab', { name: /api key/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /model/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /voice/i })).toBeVisible()
  })

  test('can navigate to model preferences tab', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: /model/i }).click()

    // Should show task type selectors
    await expect(page.getByText(/outline generation|chapter generation/i)).toBeVisible()
  })

  test('can navigate to voice profile tab', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: /voice/i }).click()

    // Should show voice profile content or re-analyze button
    const voiceContent = page.getByText(/voice|re-analyze|no voice profile/i)
    await expect(voiceContent).toBeVisible()
  })
})
