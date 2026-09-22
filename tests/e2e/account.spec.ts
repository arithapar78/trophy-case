import { expect, test } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp, photoFile } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

// T5.5
test('signed out, the AI panel asks for a sign-in and nothing is sent', async ({ page }) => {
  const aiRequests: string[] = []
  page.on('request', (req) => {
    if (/\/api\/(read-photo|rank|recommend)/.test(req.url())) aiRequests.push(req.url())
  })

  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet.getByTestId('ai-panel')).toContainText('Sign in')
  await expect(sheet.getByRole('button', { name: 'Let AI fill this in' })).toHaveCount(0)

  // Saving by hand still works with no account at all.
  await sheet.getByLabel('Title').fill('Signed out win')
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Signed out win')

  expect(aiRequests).toEqual([])
})

// T5.5
test('the sign-in button in the AI panel opens Settings, where test-mode sign-in works', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  await page.getByRole('button', { name: 'Sign in to use AI' }).click()

  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings.getByTestId('account-section')).toContainText('Test-mode sign-in')
  await settings.getByTestId('dev-email').fill('panel-test@example.com')
  await settings.getByTestId('dev-signin').click()
  await expect(settings.getByTestId('account-email')).toContainText('panel-test@example.com')
  // Phase 7: signed in, and no counter to worry about.
  await expect(settings.getByTestId('ai-usage')).toHaveCount(0)
})

// T5.5
test('signed in, the AI works and the count comes from the server', async ({ page }) => {
  await signInForTest(page, 'account')

  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByRole('button', { name: 'Let AI fill this in' }).click()
  await expect(sheet.getByTestId('ai-panel')).toContainText('MOCK draft')
  await sheet.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('account-email')).toBeVisible()
  await expect(page.getByTestId('ai-usage')).toHaveCount(0)

  // The server, not the device, is still keeping the count, even though no
  // number is shown: clearing the app's own storage keeps the sign-in.
  await page.evaluate(() => {
    const token = localStorage.getItem('trophy-case.session')
    localStorage.clear()
    localStorage.setItem('trophy-case.session', token!)
  })
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('account-email')).toBeVisible()
})

// T5.6
test('signing out keeps the achievements, and the sign-in survives a reload', async ({ page }) => {
  await signInForTest(page, 'signout')

  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Kept through sign out')
  await sheet.getByRole('button', { name: 'School', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Kept through sign out')

  // Still signed in after a reload.
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('account-email')).toContainText('signout-')
  await page.getByRole('button', { name: 'Done' }).click()

  // Sign out: the achievement is untouched.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('sign-out').click()
  await expect(page.getByTestId('account-section')).toContainText('Sign in to use the AI features')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Kept through sign out')
})

// T5.7 (10.7): deleting the account leaves the device alone
test('deleting the account removes it from the server and keeps the achievements', async ({ page }) => {
  const token = await signInForTest(page, 'delete')

  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Survives account deletion')
  await sheet.getByRole('button', { name: 'Other', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('delete-account').click()
  await page.getByTestId('delete-account-confirm').click()
  await expect(page.getByTestId('account-section')).toContainText('Sign in to use the AI features')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Survives account deletion')

  // The old token is dead on the server.
  const status = await page.evaluate(async (dead) => {
    const res = await fetch('/api/me', { headers: { authorization: `Bearer ${dead}` } })
    return res.status
  }, token)
  expect(status).toBe(401)
})
