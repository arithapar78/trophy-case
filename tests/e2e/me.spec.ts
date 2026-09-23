import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp } from './helpers/app'

async function addQuick(page: Page, title: string, category: string, result = '') {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: category, exact: true }).click()
  if (result) {
    await sheet.getByRole('button', { name: 'More details' }).click()
    await sheet.getByLabel('Result').fill(result)
  }
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('with nothing saved, the Me tab says so', async ({ page }) => {
  await page.getByRole('tab', { name: 'Me', exact: true }).click()
  await expect(page.getByTestId('me-empty')).toBeVisible()
})

test('T10.3 lists everything grouped, writes a MOCK summary on tap, keeps it, and offers a refresh after a change', async ({ page }) => {
  await signInForTest(page, 'me')
  await addQuick(page, 'Science fair', 'School', '1st place')
  await addQuick(page, 'Swim meet', 'Sports')
  await addQuick(page, 'Regional swim final', 'Sports')

  await page.getByRole('tab', { name: 'Me', exact: true }).click()
  await expect(page.getByTestId('profile-totals')).toContainText('3')
  const groups = page.getByTestId('me-group')
  await expect(groups).toHaveCount(2)
  await expect(groups.nth(0)).toContainText('School')
  await expect(groups.nth(0)).toContainText('1st place')
  await expect(groups.nth(1)).toContainText('Sports')
  await expect(groups.nth(1)).toContainText('2')
  await expect(page.getByTestId('category-chart')).toContainText('Sports')

  // Nothing is written until the button is tapped.
  await expect(page.getByTestId('profile-summary')).toHaveCount(0)
  await page.getByTestId('write-summary').click()
  await expect(page.getByTestId('profile-summary')).toContainText('MOCK')
  await expect(page.getByRole('status')).toContainText('MOCK summary')
  await expect(page.getByTestId('profile-strengths').locator('li')).toHaveCount(3)
  await expect(page.getByTestId('summary-written')).toContainText('from 3 achievements')
  await expect(page.getByTestId('write-summary')).toHaveText('Refresh')
  await expect(page.getByTestId('summary-stale')).toHaveCount(0)

  // It is kept on the device.
  await page.reload()
  await page.getByRole('tab', { name: 'Me', exact: true }).click()
  await expect(page.getByTestId('profile-summary')).toContainText('MOCK')

  // Adding one marks it as out of date, and Refresh brings it up to date.
  await addQuick(page, 'Art show', 'Arts')
  await page.getByRole('tab', { name: 'Me', exact: true }).click()
  await expect(page.getByTestId('summary-stale')).toContainText('1 added since')
  await page.getByTestId('write-summary').click()
  await expect(page.getByTestId('summary-written')).toContainText('from 4 achievements')
  await expect(page.getByTestId('summary-stale')).toHaveCount(0)

  // Tapping an achievement opens it.
  await page.getByTestId('me-list').getByRole('button', { name: /Science fair/ }).click()
  await expect(page.getByRole('dialog', { name: 'Edit achievement' })).toBeVisible()
})

test('T10.4 signed out: the list shows, the summary asks for a sign-in, and no AI request is made', async ({ page }) => {
  const aiRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/summary')) aiRequests.push(r.url())
  })
  await addQuick(page, 'Science fair', 'School')
  await page.getByRole('tab', { name: 'Me', exact: true }).click()
  await expect(page.getByTestId('me-group')).toHaveCount(1)
  await expect(page.getByTestId('write-summary')).toHaveCount(0)
  await page.getByTestId('me-signin').click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  expect(aiRequests).toEqual([])
})

// Reads the width and height out of a PNG file's header.
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('T10.5 "Save as image" makes a PNG of the card, with or without a summary, and sends nothing', async ({ page }) => {
  await signInForTest(page, 'me-image')
  await addQuick(page, 'Science fair', 'School')
  await page.getByRole('tab', { name: 'Me', exact: true }).click()

  const sent: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/')) sent.push(r.url())
  })

  // Without a summary.
  let download = page.waitForEvent('download')
  await page.getByTestId('save-image').click()
  let file = await download
  expect(file.suggestedFilename()).toMatch(/^trophy-case-profile-\d{4}-\d{2}-\d{2}\.png$/)
  expect(pngSize(readFileSync((await file.path())!))).toEqual({ width: 1080, height: 1350 })
  expect(sent).toEqual([])

  // With one.
  await page.getByTestId('write-summary').click()
  await expect(page.getByTestId('profile-summary')).toBeVisible()
  sent.length = 0
  download = page.waitForEvent('download')
  await page.getByTestId('save-image').click()
  file = await download
  expect(pngSize(readFileSync((await file.path())!))).toEqual({ width: 1080, height: 1350 })
  expect(sent).toEqual([])
})
