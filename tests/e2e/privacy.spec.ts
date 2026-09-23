import { expect, test, type Page } from '@playwright/test'
import { openFreshApp } from './helpers/app'

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click()
  return page.getByRole('dialog')
}

async function answerAge(page: Page, month: string, year: string) {
  await page.getByTestId('birth-month').selectOption({ label: month })
  await page.getByTestId('birth-year').selectOption(year)
  await page.getByTestId('age-continue').click()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('T8.2 the privacy page opens on its own and from both links', async ({ page, context }) => {
  // On its own, straight from the address.
  const direct = await context.newPage()
  await direct.goto('/privacy.html')
  await expect(direct.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await expect(direct.getByText('ariquery@gmail.com')).toBeVisible()
  await direct.close()

  const settings = await openSettings(page)

  // From the link at the bottom of Settings. It opens in a new tab so a
  // Home Screen app is not left behind.
  const [fromSettings] = await Promise.all([
    context.waitForEvent('page'),
    settings.getByTestId('settings-privacy').getByRole('link').click(),
  ])
  await expect(fromSettings.getByTestId('privacy-page')).toBeVisible()
  await fromSettings.close()

  // From the sign-in area.
  const [fromSignIn] = await Promise.all([
    context.waitForEvent('page'),
    settings.getByTestId('account-section').getByRole('link', { name: 'How your data is handled' }).click(),
  ])
  await expect(fromSignIn.getByTestId('privacy-page')).toBeVisible()
})

test('T8.3 under 13: no sign-in is offered, even after a reload or a second try', async ({ page }) => {
  const settings = await openSettings(page)
  const year = String(new Date().getFullYear() - 10)
  await answerAge(page, 'March', year)

  await expect(settings.getByTestId('age-too-young')).toBeVisible()
  await expect(settings.getByTestId('dev-email')).toHaveCount(0)
  await expect(settings.getByTestId('age-check')).toHaveCount(0)

  // Coming back later does not offer the question again.
  await page.reload()
  const again = await openSettings(page)
  await expect(again.getByTestId('age-too-young')).toBeVisible()
  await expect(again.getByTestId('age-check')).toHaveCount(0)
  await expect(again.getByTestId('dev-email')).toHaveCount(0)

  // The rest of the app still works.
  await again.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  await page.getByLabel('Title').fill('Science fair')
  await page.getByRole('dialog').getByRole('button', { name: 'School', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toHaveCount(1)
})

test('T8.3 13 and up: sign-in appears and the question is not asked again', async ({ page }) => {
  const settings = await openSettings(page)
  await expect(settings.getByTestId('dev-email')).toHaveCount(0)
  await answerAge(page, 'January', String(new Date().getFullYear() - 15))
  await expect(settings.getByTestId('dev-email')).toBeVisible()

  await page.reload()
  const again = await openSettings(page)
  await expect(again.getByTestId('dev-email')).toBeVisible()
  await expect(again.getByTestId('age-check')).toHaveCount(0)
})

test('T8.4 the birth month and year go nowhere', async ({ page }) => {
  const birthYear = String(new Date().getFullYear() - 37)
  const sent: string[] = []
  page.on('request', (request) => sent.push(`${request.url()} ${request.postData() ?? ''}`))

  await openSettings(page)
  await answerAge(page, 'July', birthYear)
  await expect(page.getByTestId('dev-email')).toBeVisible()

  // Not in any request.
  expect(sent.join('\n')).not.toContain(birthYear)
  expect(sent.join('\n').toLowerCase()).not.toContain('july')

  // Not in the device's storage: localStorage holds only the answer, and
  // the database has nothing about age.
  const stored = await page.evaluate(async () => {
    const local = JSON.stringify({ ...localStorage })
    const settings = await new Promise<string>((resolve) => {
      const open = indexedDB.open('trophy-case')
      open.onsuccess = () => {
        const tx = open.result.transaction('settings', 'readonly')
        const all = tx.objectStore('settings').getAll()
        all.onsuccess = () => resolve(JSON.stringify(all.result))
      }
    })
    return { local, settings }
  })
  expect(stored.local).toContain('"trophy-case.age-check":"passed"')
  expect(stored.local).not.toContain(birthYear)
  expect(stored.settings).not.toContain(birthYear)
})

test('17.4 the privacy page opens with no signal once the app is installed', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.goto('/privacy.html')
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await context.setOffline(false)
})
