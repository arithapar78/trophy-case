import { expect, test } from '@playwright/test'
import { openFreshApp } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('has a web app manifest and the iPhone install tags', async ({ page }) => {
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await page.request.get(new URL(manifestHref!, page.url()).toString()).then((r) => r.json())
  expect(manifest.name).toBe('Trophy Case')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
})

test('registers a service worker and still opens with no network', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.getByLabel('Title').fill('Saved before going offline')
  await page.getByRole('dialog').getByRole('button', { name: 'Arts', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)

  // Wait until the service worker has finished caching the app.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Trophy Case' })).toBeVisible()
  await expect(page.getByTestId('achievement-card')).toContainText('Saved before going offline')

  // Saving still works with no signal.
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.getByLabel('Title').fill('Saved while offline')
  await page.getByRole('dialog').getByRole('button', { name: 'Other', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(2)
  await context.setOffline(false)
})
