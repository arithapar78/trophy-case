import { expect, test } from '@playwright/test'
import { openFreshApp, photoFile } from './helpers/app'

// Every popup needs a way out that a thumb can reach without scrolling.
test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('the X closes the new achievement sheet and saves nothing', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Should not be saved')
  await sheet.getByRole('button', { name: 'Close without saving' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
})

test('the X closes Settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings).toBeVisible()
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(settings).toBeHidden()
})

test('the X in Settings stays reachable after scrolling down', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('button', { name: 'Delete everything' }).scrollIntoViewIfNeeded()
  // Sticky header: still on screen even though the sheet has scrolled.
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(settings).toBeHidden()
})

test('the X cancels the delete confirmation and keeps the achievement', async ({ page }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Keep me')
  await sheet.getByRole('button', { name: 'School', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('button', { name: 'Delete' }).first().click()
  const confirm = page.getByRole('dialog', { name: 'Delete this achievement?' })
  await confirm.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByTestId('achievement-card')).toContainText('Keep me')
})

test('the X closes the photo viewer', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Has a photo')
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('button', { name: 'Open photos for Has a photo' }).click()
  const viewer = page.getByRole('dialog', { name: 'Photo' })
  await expect(viewer).toBeVisible()
  await viewer.getByRole('button', { name: 'Close' }).click()
  await expect(viewer).toBeHidden()
})
