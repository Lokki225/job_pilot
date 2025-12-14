import { test as setup } from '@playwright/test'
import { access, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const storageStatePath = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await mkdir(dirname(storageStatePath), { recursive: true })

  if (!email || !password) {
    const hasExistingState = await access(storageStatePath)
      .then(() => true)
      .catch(() => false)

    if (hasExistingState) {
      return
    }

    throw new Error('Missing E2E_EMAIL or E2E_PASSWORD environment variables')
  }

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /login/i }).click()

  await page.waitForURL('**/dashboard')

  await page.context().storageState({ path: storageStatePath })
})
