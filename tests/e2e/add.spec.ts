import { expect, test } from '@playwright/test'
import { openFreshApp, photoFile } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('the camera button is wired to the phone camera', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible()
  const input = page.getByTestId('camera-input')
  await expect(input).toHaveAttribute('accept', 'image/*')
  await expect(input).toHaveAttribute('capture', 'environment')
})

test('an empty timeline explains what to do', async ({ page }) => {
  await expect(page.getByText('Nothing here yet')).toBeVisible()
})

test('add an achievement with a photo; it survives a reload', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet).toBeVisible()
  await expect(sheet.locator('img')).toHaveCount(1)

  await sheet.getByLabel('Title').fill('Regional science fair, 1st place')
  await sheet.getByRole('button', { name: 'School', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()

  await expect(sheet).toBeHidden()
  const card = page.getByTestId('achievement-card')
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Regional science fair, 1st place')
  await expect(card).toContainText('School')
  await expect(card.locator('img')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('achievement-card')).toContainText('Regional science fair, 1st place')
})

test('add one without a photo, with the extra details', async ({ page }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Basketball MVP')
  await sheet.getByRole('button', { name: 'Sports', exact: true }).click()
  await sheet.getByRole('button', { name: 'More details' }).click()
  await sheet.getByLabel('Team, club or school').fill('Middlesex Magic')
  await sheet.getByLabel('Result').fill('MVP')
  await sheet.getByLabel('Note').fill('Scored 22 in the final.')
  await sheet.getByRole('button', { name: 'Save' }).click()

  const card = page.getByTestId('achievement-card')
  await expect(card).toContainText('Basketball MVP')
  await expect(card).toContainText('Middlesex Magic · MVP')
  await expect(card).toContainText('Scored 22 in the final.')
  await expect(card.locator('img')).toHaveCount(0)
})

test('an empty title shows an error and saves nothing', async ({ page }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet.getByText('Give it a title.')).toBeVisible()
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
})

test('a non-photo file is refused', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles({
    name: 'certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 not really'),
  })
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet.getByText("isn't a photo")).toBeVisible()
  await sheet.getByLabel('Title').fill('Should not save')
  await sheet.getByRole('button', { name: 'Other', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet.getByText('Remove the photos that could not be read')).toBeVisible()
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
})

test('a big photo is resized before it is stored', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile('huge.png', 2400, 1800))
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Big photo')
  await sheet.getByRole('button', { name: 'Other', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole('button', { name: /Open photos/ }).click()
  const img = page.getByRole('dialog', { name: 'Photo' }).locator('img').first()
  await expect(img).toBeVisible()
  const size = await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])
  expect(size).toEqual([1600, 1200])
})

test('up to five photos, and the cover shows how many more there are', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile('one.png'))
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await page.getByTestId('add-photo-input').setInputFiles([
    photoFile('two.png'), photoFile('three.png'), photoFile('four.png'), photoFile('five.png'),
  ])
  await expect(sheet.getByTestId('photo-strip').locator('img')).toHaveCount(5)
  await expect(sheet.getByRole('button', { name: 'Add another' })).toHaveCount(0)

  await sheet.getByLabel('Title').fill('Five photos')
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('+4')
})

test('cancel, tapping the background and Escape all save nothing', async ({ page }) => {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.getByLabel('Title').fill('Cancelled')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.mouse.click(10, 10)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
})
