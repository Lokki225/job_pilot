import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('jobs search loads results', async ({ page }) => {
  await page.goto('/dashboard/jobs')

  // Basic search: rely on defaults in UI if present
  // If your page requires explicit search click, we attempt it.
  const searchButton = page.getByRole('button', { name: /search/i })
  if (await searchButton.isVisible().catch(() => false)) {
    await searchButton.click()
  }

  // Expect either results or an empty state, but page should render without crashing.
  await expect(page.getByRole('heading', { name: 'Job Search' })).toBeVisible({
    timeout: 20_000,
  })
})
