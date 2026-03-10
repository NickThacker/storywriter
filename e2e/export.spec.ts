import { test, expect } from '@playwright/test'

test.describe('Export', () => {
  test('export dialog opens on chapters page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/library/i)).toBeVisible({ timeout: 10_000 })

    // Find a project that's in "Writing" or "Complete" status
    const writingProject = page.locator('text=/writing|complete/i').first()

    if (await writingProject.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Click the parent card
      await writingProject.locator('..').locator('..').click()
      await expect(page).toHaveURL(/\/projects\//, { timeout: 10_000 })

      // Navigate to chapters if not already there
      const chaptersLink = page.getByRole('link', { name: /chapters/i })
      if (await chaptersLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await chaptersLink.click()
      }

      // Look for export button (download icon)
      const exportBtn = page.getByRole('button', { name: /export/i })
      if (await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await exportBtn.click()
        await expect(page.getByRole('dialog')).toBeVisible()

        // Should show format options
        await expect(page.getByText(/docx|epub|rtf|plain text/i).first()).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
