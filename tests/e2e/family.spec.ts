import { expect, test, type Page } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp } from './helpers/app'

async function addQuick(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: 'School', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
}

async function addChild(page: Page, name: string, year: string) {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('add-child').click()
  await page.getByLabel("Child's first name").fill(name)
  await page.getByLabel("Child's birth month").selectOption('3')
  await page.getByLabel("Child's birth year").selectOption(year)
  await page.getByTestId('add-child-save').click()
  await expect(page.getByTestId('family-profile').filter({ hasText: name })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('T15.3 a child gets a separate case; switching back keeps the original; removing deletes it', async ({ page }) => {
  await addQuick(page, 'My science fair')
  await addChild(page, 'Rohan', '2017')

  await page.getByTestId('switch-Rohan').click()
  await expect(page.getByTestId('case-label')).toHaveText(/Rohan's case/)
  await expect(page.getByTestId('achievement-card')).toHaveCount(0)
  // No welcome card in a child's case.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await addQuick(page, 'Spelling bee')
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)

  await page.getByTestId('case-label').click()
  await page.getByTestId('family-profile').first().getByRole('button', { name: 'Open' }).click()
  await expect(page.getByTestId('case-label')).toHaveText(/My case/)
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
  await expect(page.getByTestId('achievement-card')).toContainText('My science fair')

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('open-case-note')).toBeVisible()
  await page.getByTestId('remove-Rohan').click()
  await expect(page.getByTestId('confirm-remove-child')).toContainText('1 achievement')
  await page.getByTestId('remove-child-yes').click()
  await expect(page.getByTestId('family-profile')).toHaveCount(1)
})

test('T15.4 under 13: AI refused until a parent gives permission, and again after withdrawing', async ({ page }) => {
  await signInForTest(page, 'parent')
  await addChild(page, 'Maya', '2018')
  await page.getByTestId('switch-Maya').click()
  await expect(page.getByTestId('case-label')).toHaveText(/Maya's case/)

  const askScout = async () => {
    await page.getByRole('tab', { name: 'Scout', exact: true }).click()
    await page.getByRole('textbox').last().fill('What next?')
    await page.getByRole('button', { name: 'Send' }).click()
  }
  await askScout()
  await expect(page.getByText('A parent needs to give permission')).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  const maya = page.getByTestId('family-profile').filter({ hasText: 'Maya' })
  await maya.getByTestId('start-consent').click()
  await expect(maya.getByTestId('give-consent')).toBeDisabled()
  await maya.getByTestId('consent-parent').check()
  await maya.getByTestId('consent-agree').check()
  await maya.getByTestId('give-consent').click()
  await expect(maya.getByTestId('child-consent')).toContainText('AI allowed by you')
  await page.keyboard.press('Escape')

  await askScout()
  await expect(page.getByTestId('scout-reply').last()).toContainText('MOCK')

  await page.getByRole('button', { name: 'Settings' }).click()
  await maya.getByTestId('withdraw-consent').click()
  await expect(maya.getByTestId('start-consent')).toBeVisible()
  await page.keyboard.press('Escape')
  await askScout()
  await expect(page.getByText('A parent needs to give permission').last()).toBeVisible()
})
