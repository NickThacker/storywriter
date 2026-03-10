import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('loads and shows library heading or empty state', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/your library|start your first novel/i)
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('can open create project dialog', async ({ page }) => {
    await page.goto('/dashboard')

    // Click whichever create button exists (empty state or header)
    const createBtn = page.getByRole('button', { name: /new novel|start writing/i })
    await createBtn.click()

    // Dialog should appear with title input
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('#create-title')).toBeVisible()
  })

  test('can create a new project', async ({ page }) => {
    await page.goto('/dashboard')

    const createBtn = page.getByRole('button', { name: /new novel|start writing/i })
    await createBtn.click()

    await page.locator('#create-title').fill('E2E Test Novel')

    // Select a genre from the dropdown
    const genreSelect = page.getByRole('dialog').locator('select, [role="combobox"]')
    if (await genreSelect.isVisible()) {
      await genreSelect.click()
      await page.getByRole('option', { name: /fantasy/i }).click()
    }

    await page.getByRole('button', { name: /create project/i }).click()

    // Should navigate to project page (intake or outline)
    await expect(page).toHaveURL(/\/projects\//, { timeout: 15_000 })
  })
})
