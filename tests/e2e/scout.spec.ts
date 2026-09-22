// Phase 7 end to end: Scout, and the app with nothing to count and nothing
// to buy. This is the app as it actually ships.

import { expect, test } from '@playwright/test'
import { signInForTest } from './helpers/account'
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

// T7.8
test('no counter anywhere, and nothing is for sale', async ({ page }) => {
  await signInForTest(page, 'scout-nocount')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })

  await expect(settings.getByTestId('account-email')).toBeVisible()
  await expect(settings.getByTestId('ai-usage')).toHaveCount(0)
  await expect(settings.getByTestId('plan-section')).toHaveCount(0)
  await expect(settings.getByTestId('upgrade')).toHaveCount(0)
  await expect(settings).not.toContainText(/uses left|upgrade|\$10|per month/i)
})

// T7.6
test('the Scout tab is there, sends a message, and shows the answer', async ({ page }) => {
  await addQuick(page, 'Won the county science fair', 'School')
  await signInForTest(page, 'scout-basic')

  await page.getByRole('tab', { name: 'Scout' }).click()
  await expect(page.getByTestId('scout-view')).toBeVisible()
  await expect(page.getByTestId('scout-intro')).toContainText('1 saved achievement')

  await page.getByTestId('scout-input').fill('What should I put first?')
  await page.getByTestId('scout-send').click()

  await expect(page.getByTestId('scout-mine')).toContainText('What should I put first?')
  await expect(page.getByTestId('scout-reply')).toContainText('MOCK Scout')
  // Scout can see the timeline, so its answer names what is on it.
  await expect(page.getByTestId('scout-reply')).toContainText('Won the county science fair')
})

// T7.6
test('the conversation is kept on the device and survives a reload', async ({ page }) => {
  await addQuick(page, 'Robotics club', 'School')
  await signInForTest(page, 'scout-persist')

  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('scout-input').fill('Remember this message')
  await page.getByTestId('scout-send').click()
  await expect(page.getByTestId('scout-reply')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Scout' }).click()
  await expect(page.getByTestId('scout-mine')).toContainText('Remember this message')
  await expect(page.getByTestId('scout-reply')).toContainText('MOCK Scout')
})

test('clearing the conversation empties it and leaves the achievements alone', async ({ page }) => {
  await addQuick(page, 'Chess club captain', 'School')
  await signInForTest(page, 'scout-clear')

  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('scout-input').fill('Something to clear')
  await page.getByTestId('scout-send').click()
  await expect(page.getByTestId('scout-reply')).toBeVisible()

  await page.getByTestId('scout-clear').click()
  await page.getByTestId('scout-clear-confirm-button').click()
  await expect(page.getByTestId('scout-mine')).toHaveCount(0)
  await expect(page.getByTestId('scout-intro')).toBeVisible()

  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Chess club captain')
})

test('signed out, Scout asks for a sign-in and sends nothing', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/scout')) calls.push(req.url())
  })

  await page.getByRole('tab', { name: 'Scout' }).click()
  await expect(page.getByTestId('scout-signin')).toBeVisible()
  await expect(page.getByTestId('scout-input')).toHaveCount(0)
  expect(calls).toEqual([])
})

test('with an empty timeline Scout says so rather than inventing something', async ({ page }) => {
  await signInForTest(page, 'scout-empty')
  await page.getByRole('tab', { name: 'Scout' }).click()

  await expect(page.getByTestId('scout-intro')).toContainText('timeline is empty')
  await page.getByTestId('scout-input').fill('What should I do?')
  await page.getByTestId('scout-send').click()
  await expect(page.getByTestId('scout-reply')).toContainText('timeline is empty')
})

test('a file can be attached and taken off again before sending', async ({ page }) => {
  await addQuick(page, 'Existing win', 'School')
  await signInForTest(page, 'scout-attach')
  await page.getByRole('tab', { name: 'Scout' }).click()

  await page.getByTestId('scout-file').setInputFiles(photoFile())
  await expect(page.getByTestId('scout-attachment')).toContainText('win.png')
  await page.getByTestId('scout-attachment').getByRole('button', { name: 'Remove file' }).click()
  await expect(page.getByTestId('scout-attachment')).toHaveCount(0)
})

// T7.7
test('a proposed achievement is not saved until Save is tapped', async ({ page }) => {
  await addQuick(page, 'Existing win', 'School')
  await signInForTest(page, 'scout-save')
  await page.getByRole('tab', { name: 'Scout' }).click()

  await page.getByTestId('scout-file').setInputFiles(photoFile())
  await page.getByTestId('scout-input').fill('What is in this?')
  await page.getByTestId('scout-send').click()

  await expect(page.getByTestId('scout-mine')).toContainText('win.png')
  await expect(page.getByTestId('scout-proposed')).toBeVisible()
  await expect(page.getByTestId('proposed-title')).toContainText('MOCK achievement from win.png')

  // Still just the one achievement: the card is an offer, not a save.
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)

  // Turning it down leaves nothing behind.
  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('proposed-discard').click()
  await expect(page.getByTestId('scout-proposed')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
})

// T7.7
test('saving a proposed achievement puts it on the timeline', async ({ page }) => {
  await addQuick(page, 'Existing win', 'School')
  await signInForTest(page, 'scout-save-yes')
  await page.getByRole('tab', { name: 'Scout' }).click()

  await page.getByTestId('scout-file').setInputFiles(photoFile('transcript.png'))
  await page.getByTestId('scout-send').click()
  await expect(page.getByTestId('scout-proposed')).toBeVisible()

  await page.getByTestId('proposed-save').click()
  await expect(page.getByTestId('scout-proposed')).toHaveCount(0)
  await expect(page.getByTestId('scout-reply').last()).toContainText('Saved')

  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(2)
  await expect(page.getByTestId('achievement-card').first()).toContainText('MOCK achievement from transcript.png')
})

test('a file Scout cannot read is refused before anything is sent', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/scout')) calls.push(req.url())
  })

  await addQuick(page, 'Something', 'School')
  await signInForTest(page, 'scout-badfile')
  await page.getByRole('tab', { name: 'Scout' }).click()

  await page.getByTestId('scout-file').setInputFiles({
    name: 'archive.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('not really a zip'),
  })
  await page.getByTestId('scout-input').fill('Read this')
  await page.getByTestId('scout-send').click()

  await expect(page.getByTestId('scout-error')).toContainText('pictures, PDFs and plain text')
  expect(calls).toEqual([])
})
