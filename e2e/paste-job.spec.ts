import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('paste job -> save -> appears in applications', async ({ page }) => {
  const unique = `${Date.now()}`
  const jobTitle = `Senior QA Engineer E2E ${unique}`
  const company = `E2E Test Corp ${unique}`

  const posting = `${jobTitle}
Company: ${company}
Location: Remote
Job Type: Full-time
Salary: $100k-$120k

Job Description:
We are looking for a QA Engineer to help improve our test automation.

Requirements:
- Playwright
- TypeScript
`

  await page.goto('/dashboard/jobs')

  await page.getByRole('button', { name: 'Paste Job' }).click()
  await expect(page.getByRole('heading', { name: 'Paste Job Posting' })).toBeVisible({
    timeout: 20_000,
  })

  await page.locator('textarea').fill(posting)
  await page.getByRole('button', { name: 'Extract Job Details' }).click()

  await expect(page.getByText('Job Details Extracted Successfully!')).toBeVisible({
    timeout: 60_000,
  })

  await expect(page.getByText('AI Powered')).toHaveCount(0, { timeout: 5_000 })

  await expect(page.getByRole('heading', { name: jobTitle })).toBeVisible({
    timeout: 20_000,
  })

  await page.getByRole('button', { name: 'Save to Applications' }).click()

  await page.waitForURL('**/dashboard/jobs/applications', { timeout: 30_000 })

  await expect(page.getByRole('heading', { name: 'My Applications' })).toBeVisible({
    timeout: 20_000,
  })

  await expect(page.getByText('Loading applications...')).toHaveCount(0, { timeout: 20_000 })

  await expect(page.getByRole('heading', { name: jobTitle, level: 4 })).toBeVisible({
    timeout: 20_000,
  })
})
