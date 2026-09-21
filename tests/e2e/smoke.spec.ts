import { expect, test } from '@playwright/test'

// Phase 0 smoke test: the page loads at phone size and shows the name.
test('shows the app name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Trophy Case' })).toBeVisible()
})
