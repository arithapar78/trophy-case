import { expect, test } from '@playwright/test'
import { openFreshApp, photoFile } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('back up, delete everything, restore: the achievements come back', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Backed up win')
  await sheet.getByRole('button', { name: 'Community Service', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings).toContainText('1 achievement saved on this device')

  // In this browser there is no share sheet, so the backup downloads.
  const downloadPromise = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Back up everything' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^trophy-case-backup-\d{4}-\d{2}-\d{2}\.zip$/)
  const savedTo = await download.path()
  await expect(settings.getByRole('status')).toContainText('Backup saved')

  // Delete everything needs the word typed out.
  await settings.getByRole('button', { name: 'Delete everything' }).click()
  const confirmButton = settings.getByRole('button', { name: 'Delete everything' })
  await expect(confirmButton).toBeDisabled()
  await settings.getByLabel('Type DELETE to confirm').fill('DELETE')
  await confirmButton.click()
  await expect(settings).toContainText('0 achievements saved')
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('restore-input').setInputFiles(savedTo!)
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('status')).toContainText('Restored 1 achievement and 1 photo')
  await page.getByRole('button', { name: 'Done' }).click()

  const card = page.getByTestId('achievement-card')
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Backed up win')
  await expect(card.locator('img')).toBeVisible()

  // Restoring again does not duplicate.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('restore-input').setInputFiles(savedTo!)
  await expect(page.getByRole('dialog', { name: 'Settings' })).toContainText('1 achievement saved')
})

test('a file that is not a backup is refused', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('restore-input').setInputFiles({ name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.from('nope') })
  await expect(page.getByRole('alert')).toContainText("isn't a Trophy Case backup")
})
