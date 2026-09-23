// Phase 12: the hello card. A welcome the first time, what's new after an
// update, and a way back to it from Settings.
import { expect, test } from '@playwright/test'
import { openFreshApp } from './helpers/app'

test('a fresh device is welcomed, remembers the name, and Settings reopens it (T12.3)', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(r.url())
  })
  await openFreshApp(page, { keepHello: true })
  // Sign-in status is checked on every start; only count what the card could cause.
  requests.length = 0

  const card = page.getByTestId('hello-card')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('hello-greeting')).toHaveText('Hi there')
  await expect(card).toContainText('How it works')

  await page.getByTestId('hello-name').fill('Ari')
  await expect(page.getByTestId('hello-greeting')).toHaveText('Hi Ari')
  await page.getByTestId('hello-done').click()
  await expect(card).toBeHidden()
  expect(requests).toEqual([])

  await page.reload()
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await expect(card).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('open-hello').click()
  await expect(card).toBeVisible()
  await expect(page.getByTestId('hello-greeting')).toHaveText('Hi Ari')
  await expect(page.getByTestId('whats-new-list')).toBeVisible()
  await expect(page.getByTestId('hello-name')).toHaveValue('Ari')
})

test('an update shows what is new, by name, and the X closes it for good (T12.4)', async ({ page }) => {
  // Leave the welcome open (unanswered) so nothing is saved behind our back.
  await openFreshApp(page, { keepHello: true })
  await expect(page.getByTestId('hello-card')).toBeVisible()
  // Pretend this device saw an older list and saved a name.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('trophy-case')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite')
          const store = tx.objectStore('settings')
          store.put({ key: 'whatsNewSeen', value: 'an-older-list' })
          store.put({ key: 'name', value: 'Ari' })
          tx.oncomplete = () => {
            open.result.close()
            resolve()
          }
        }
      }),
  )
  await page.reload()

  const card = page.getByTestId('hello-card')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('hello-greeting')).toHaveText('Hi Ari')
  await expect(card).toContainText("Here's what's new")
  await expect(page.getByTestId('whats-new-list')).toBeVisible()
  // A name is already saved, so the card does not ask for it again.
  await expect(page.getByTestId('hello-name')).toHaveCount(0)

  await card.getByRole('button', { name: 'Close' }).click()
  await expect(card).toBeHidden()
  await page.reload()
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await expect(card).toBeHidden()
})
