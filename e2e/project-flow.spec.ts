import { test, expect } from '@playwright/test'

test.describe('Project Flow', () => {
  // This test walks through intake steps — doesn't call AI, just validates UI
  test('intake wizard renders all steps', async ({ page }) => {
    // First create a project to get a valid project URL
    await page.goto('/dashboard')
    await expect(page.getByText(/library|start your first novel/i)).toBeVisible({ timeout: 10_000 })

    const createBtn = page.getByRole('button', { name: /new novel|start writing/i })
    await createBtn.click()
    await page.locator('#create-title').fill('E2E Intake Test')

    const genreSelect = page.getByRole('dialog').locator('select, [role="combobox"]')
    if (await genreSelect.isVisible()) {
      await genreSelect.click()
      await page.getByRole('option', { name: /fantasy/i }).click()
    }

    await page.getByRole('button', { name: /create project/i }).click()
    await expect(page).toHaveURL(/\/projects\//, { timeout: 15_000 })

    // Should be on intake page — look for path selection or step content
    const pathSelect = page.getByText(/build step by step|already have an idea/i)
    await expect(pathSelect).toBeVisible({ timeout: 10_000 })

    // Select "Build Step by Step"
    await page.getByText(/build step by step/i).click()

    // Should advance to genre step
    await expect(page.getByText(/genre/i)).toBeVisible({ timeout: 5_000 })

    // Select a genre card
    await page.getByText(/fantasy/i).first().click()

    // Click next
    await page.getByRole('button', { name: /next/i }).click()

    // Should be on themes step
    await expect(page.getByText(/theme/i)).toBeVisible({ timeout: 5_000 })
  })

  test('project phase navigation shows correct tabs', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/library|start your first novel/i)).toBeVisible({ timeout: 10_000 })

    // Click on first project card if one exists
    const projectCard = page.locator('[class*="card"], a[href*="/projects/"]').first()
    if (await projectCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await projectCard.click()
      await expect(page).toHaveURL(/\/projects\//, { timeout: 10_000 })

      // Phase nav should show tabs
      const phaseNav = page.getByText(/intake|outline|chapters|story bible/i)
      await expect(phaseNav.first()).toBeVisible({ timeout: 5_000 })
    }
  })
})
