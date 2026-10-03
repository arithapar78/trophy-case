// Phase 11 end to end: Scout proposes edits, and nothing changes until the
// student confirms. Driven by MOCK mode, so no API key is needed.

import { expect, test } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp } from './helpers/app'

async function addAchievement(page: import('@playwright/test').Page, title: string) {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: 'School', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
}

// Asks Scout in MOCK mode, which proposes a sample edit (22.7). The sample
// changes are: organisation → Middlesex Magic, and result → Regional final,
// both on the single achievement.
async function askForAnEdit(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('scout-input').fill('Add Middlesex Magic to all my basketball achievements')
  await page.getByTestId('scout-send').click()
  await expect(page.getByTestId('scout-changes')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

// T11.3
test('Cancel changes nothing: the proposal appears, then leaves the timeline alone', async ({ page }) => {
  await addAchievement(page, 'Science fair win')
  await signInForTest(page, 'edits-cancel')
  await askForAnEdit(page)

  // There is a proposal to look at...
  await expect(page.getByTestId('scout-changes')).toContainText('Middlesex Magic')

  // ...but nothing has reached the timeline yet.
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card').first()).not.toContainText('Middlesex Magic')

  // Turning it down changes nothing either.
  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('changes-cancel').click()
  await expect(page.getByTestId('scout-changes')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card').first()).not.toContainText('Middlesex Magic')
})

// T11.3
test('Confirm applies the ticked changes, and Undo reverses exactly them', async ({ page }) => {
  await addAchievement(page, 'Science fair win')
  await signInForTest(page, 'edits-confirm')
  await askForAnEdit(page)

  // Show what the proposal carries and untick the second change.
  await expect(page.getByTestId('change-tick-0')).toBeChecked()
  await page.getByTestId('change-tick-1').uncheck()
  await page.getByTestId('changes-confirm').click()

  await expect(page.getByTestId('scout-changes')).toHaveCount(0)
  await expect(page.getByTestId('scout-undo')).toBeVisible()

  // Only the ticked change landed: the organisation, not the result.
  await page.getByRole('tab', { name: 'Timeline' }).click()
  const card = page.getByTestId('achievement-card').first()
  await expect(card).toContainText('Middlesex Magic')
  await expect(card).not.toContainText('Regional final')

  // Undo puts back exactly what changed.
  await page.getByRole('tab', { name: 'Scout' }).click()
  await page.getByTestId('scout-undo-button').click()
  await expect(page.getByTestId('scout-undo')).toHaveCount(0)

  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByTestId('achievement-card').first()).not.toContainText('Middlesex Magic')
})