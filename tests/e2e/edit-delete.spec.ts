import { expect, test } from '@playwright/test'
import { openFreshApp, photoFile } from './helpers/app'

async function addQuick(page: import('@playwright/test').Page, title: string, category: string) {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: category, exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('edit an achievement, then delete it with confirmation; it stays gone after a reload', async ({ page }) => {
  await addQuick(page, 'Debate semifinal', 'Debate')

  await page.getByRole('button', { name: 'Edit' }).click()
  const sheet = page.getByRole('dialog', { name: 'Edit achievement' })
  await expect(sheet.getByLabel('Title')).toHaveValue('Debate semifinal')
  await sheet.getByLabel('Title').fill('Debate final')
  await sheet.getByTestId('add-photo-input').setInputFiles(photoFile())
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  const card = page.getByTestId('achievement-card')
  await expect(card).toContainText('Debate final')
  await expect(card.locator('img')).toBeVisible()

  // Cancelling the confirmation leaves it in place.
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete this achievement?' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(card).toHaveCount(1)

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete this achievement?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
  await expect(page.getByText('Nothing here yet')).toBeVisible()
})

test('cancelling an edit keeps a removed photo', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const add = page.getByRole('dialog', { name: 'New achievement' })
  await add.getByLabel('Title').fill('Keep my photo')
  await add.getByRole('button', { name: 'Cooking', exact: true }).click()
  await add.getByRole('button', { name: 'Save' }).click()
  await expect(add).toBeHidden()

  await page.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit achievement' })
  await edit.getByRole('button', { name: 'Remove photo' }).click()
  await expect(edit.getByTestId('photo-strip').locator('img')).toHaveCount(0)
  await edit.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByTestId('achievement-card').locator('img')).toBeVisible()
})

test('search and the category filter narrow the timeline together', async ({ page }) => {
  await addQuick(page, 'Regional debate final', 'Debate')
  await addQuick(page, 'Regional swim meet', 'Sports')
  await addQuick(page, 'Bake sale', 'Cooking')
  await expect(page.getByTestId('achievement-card')).toHaveCount(3)

  await page.getByLabel('Search achievements').fill('REGIONAL')
  await expect(page.getByTestId('achievement-card')).toHaveCount(2)

  await page.getByRole('group', { name: 'Category filter' }).getByRole('button', { name: 'Sports', exact: true }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
  await expect(page.getByTestId('achievement-card')).toContainText('Regional swim meet')

  await page.getByLabel('Search achievements').fill('bake')
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
  await expect(page.getByText('Nothing matches')).toBeVisible()

  await page.getByRole('group', { name: 'Category filter' }).getByRole('button', { name: 'All' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
  await expect(page.getByTestId('achievement-card')).toContainText('Bake sale')
})
