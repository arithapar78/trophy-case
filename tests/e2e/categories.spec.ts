import { expect, test, type Page } from '@playwright/test'
import { openFreshApp } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

const filterRow = (page: Page) => page.getByRole('group', { name: 'Category filter' })

test('everyone starts with the broad list', async ({ page }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const picker = page.getByRole('dialog', { name: 'New achievement' }).getByRole('group', { name: 'Category' })
  for (const name of ['School', 'Sports', 'Arts', 'Community Service', 'Work', 'Clubs & Leadership', 'Awards', 'Other']) {
    await expect(picker.getByRole('button', { name, exact: true })).toBeVisible()
  }
  await expect(picker.getByRole('button', { name: 'Debate', exact: true })).toHaveCount(0)
})

test('T9.5 add a category from the details sheet, save into it, filter, rename, delete', async ({ page }) => {
  // Add it while saving an achievement.
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Regional debate final')
  await sheet.getByTestId('new-category').click()
  await sheet.getByTestId('new-category-name').fill('  Debate ')
  await sheet.getByTestId('new-category-save').click()
  // It is added and already picked.
  await expect(sheet.getByRole('button', { name: 'Debate', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  // A second one, in a starter category.
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await sheet.getByLabel('Title').fill('Swim meet')
  await sheet.getByRole('button', { name: 'Sports', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  // The filter shows only categories in use.
  await expect(filterRow(page).getByRole('button')).toHaveText(['All', 'Sports', 'Debate'])
  await filterRow(page).getByRole('button', { name: 'Debate', exact: true }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
  await expect(page.getByTestId('achievement-card')).toContainText('Regional debate final')

  // Rename it in Settings: the achievement follows.
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const section = settings.getByTestId('categories-section')
  await section.getByRole('button', { name: 'Rename Debate' }).click()
  await section.getByTestId('rename-category-input').fill('Speech & Debate')
  await section.getByTestId('rename-category-save').click()
  await expect(section.getByTestId('custom-category')).toHaveText(/Speech & Debate/)
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(filterRow(page).getByRole('button')).toHaveText(['All', 'Sports', 'Speech & Debate'])
  await expect(page.getByTestId('achievement-card')).toHaveCount(2)
  await expect(page.getByTestId('achievement-card').filter({ hasText: 'Regional debate final' })).toContainText('Speech & Debate')

  // Delete it: it says how many move, and they land in Other.
  await page.getByRole('button', { name: 'Settings' }).click()
  await section.getByRole('button', { name: 'Delete Speech & Debate' }).click()
  await expect(section.getByTestId('delete-category-message')).toContainText('1 achievement will move to Other')
  await section.getByTestId('delete-category-confirm').click()
  await expect(section.getByTestId('custom-category')).toHaveCount(0)
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(2)
  await expect(filterRow(page).getByRole('button')).toHaveText(['All', 'Sports', 'Other'])
  await expect(page.getByTestId('achievement-card').filter({ hasText: 'Regional debate final' })).toContainText('Other')

  // It all survives a reload.
  await page.reload()
  await expect(filterRow(page).getByRole('button')).toHaveText(['All', 'Sports', 'Other'])
})

test('a repeated name is refused with a plain message', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const section = page.getByRole('dialog', { name: 'Settings' }).getByTestId('categories-section')
  await section.getByTestId('settings-new-category').fill('Robotics')
  await section.getByTestId('settings-add-category').click()
  await expect(section.getByTestId('custom-category')).toHaveCount(1)
  await section.getByTestId('settings-new-category').fill('ROBOTICS')
  await section.getByTestId('settings-add-category').click()
  await expect(section.getByRole('alert')).toContainText('already have that category')
  await expect(section.getByTestId('custom-category')).toHaveCount(1)
})

test('T9.6 a backup with a custom category restores it on a fresh device', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByTestId('settings-new-category').fill('Chess')
  await settings.getByTestId('settings-add-category').click()
  await expect(settings.getByTestId('custom-category')).toHaveCount(1)
  await settings.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Chess club champion')
  await sheet.getByRole('button', { name: 'Chess', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  const downloadPromise = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Back up everything' }).click()
  const savedTo = await (await downloadPromise).path()

  // A fresh device: nothing saved, no custom categories.
  await openFreshApp(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(settings.getByTestId('custom-category')).toHaveCount(0)
  await page.getByTestId('restore-input').setInputFiles(savedTo!)
  await expect(settings.getByRole('status')).toContainText('Restored 1 achievement')
  await expect(settings.getByTestId('custom-category')).toHaveText(/Chess/)
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(filterRow(page).getByRole('button')).toHaveText(['All', 'Chess'])
})
