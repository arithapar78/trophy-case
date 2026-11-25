import { expect, test } from '@playwright/test'
import { openFreshApp } from './helpers/app'

const pageColour = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const DARK = 'rgb(10, 15, 28)'
const LIGHT = 'rgb(244, 245, 247)'

test('T16a.2 Dark and Light apply at once, survive a reload, and beat the phone setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openFreshApp(page)
  expect(await pageColour(page)).toBe(LIGHT)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('theme-dark').click()
  await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true')
  expect(await pageColour(page)).toBe(DARK)

  await page.reload()
  expect(await pageColour(page)).toBe(DARK)
  expect(await page.locator('meta[name="theme-color"]').first().getAttribute('content')).toBe('#0a0f1c')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('theme-light').click()
  expect(await pageColour(page)).toBe(LIGHT)

  await page.getByTestId('theme-system').click()
  expect(await pageColour(page)).toBe(DARK)
})
