import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('job details page renders (similar jobs section present or empty)', async ({ page }) => {
  await page.goto('/dashboard/jobs')

  // Navigate to Applications list if your app uses that route; otherwise this is a no-op.
  // Fallback: directly try applications route.
  await page.goto('/dashboard/jobs/applications')

  await expect(page.getByRole('heading', { name: 'My Applications' })).toBeVisible({
    timeout: 20_000,
  })

  await expect(page.getByText('Loading applications...')).toHaveCount(0, { timeout: 20_000 })

  // Click first application card title if present.
  const emptyStateHeading = page.getByRole('heading', { name: 'No applications yet' })
  if (await emptyStateHeading.count()) {
    await expect(emptyStateHeading).toBeVisible({ timeout: 20_000 })
  } else {
    const firstCardTitle = page.locator('h4.cursor-pointer').first()
    await expect(firstCardTitle).toBeVisible({ timeout: 20_000 })
    await firstCardTitle.click()
    await expect(page).toHaveURL(/\/dashboard\/jobs\//)

    // Similar Jobs section heading
    await expect(page.getByRole('heading', { name: 'Similar Jobs' })).toBeVisible({ timeout: 20_000 })
  }
})
