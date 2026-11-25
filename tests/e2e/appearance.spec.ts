import { expect, test } from '@playwright/test'
import { openFreshApp } from './helpers/app'

const pageColour = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const DARK = 'rgb(10, 15, 28)'
const LIGHT = 'rgb(244, 245, 247)'

test('T16a.2 the toggle next to Settings switches light and dark at once, and it sticks', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openFreshApp(page)
  const toggle = page.getByTestId('theme-toggle')
  // Follows the phone until tapped.
  expect(await pageColour(page)).toBe(LIGHT)
  await expect(toggle).toHaveAccessibleName('Switch to dark mode')

  await toggle.click()
  expect(await pageColour(page)).toBe(DARK)
  await expect(toggle).toHaveAccessibleName('Switch to light mode')

  await page.reload()
  expect(await pageColour(page)).toBe(DARK)
  expect(await page.locator('meta[name="theme-color"]').first().getAttribute('content')).toBe('#0a0f1c')

  // The choice wins over the phone's own setting.
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByTestId('theme-toggle').click()
  expect(await pageColour(page)).toBe(LIGHT)
  await page.reload()
  expect(await pageColour(page)).toBe(LIGHT)

  // Settings no longer has an Appearance section.
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('appearance-section')).toHaveCount(0)
})

test('T16a.3 on a dark phone the toggle starts dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openFreshApp(page)
  expect(await pageColour(page)).toBe(DARK)
  await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to light mode')
})
