import { expect, test } from '@playwright/test'
import { signInForTest, spendAiUses } from './helpers/account'
import { openFreshApp, photoFile } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
  await signInForTest(page, 'ai')
})

test('with AI off, choosing a photo makes no request to the AI function', async ({ page }) => {
  const aiRequests: string[] = []
  page.on('request', (req) => {
    if (/\/api\/(read-photo|rank|recommend)/.test(req.url())) aiRequests.push(req.url())
  })

  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet.getByRole('button', { name: 'Let AI fill this in' })).toBeVisible()
  await expect(sheet.getByTestId('ai-panel')).toContainText('10 of 10 AI uses left')
  await sheet.getByLabel('Title').fill('Done by hand')
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  expect(aiRequests).toEqual([])
})

test('tapping the button fills a MOCK draft and says so', async ({ page }) => {
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByRole('button', { name: 'Let AI fill this in' }).click()

  await expect(sheet.getByTestId('ai-panel')).toContainText('MOCK draft')
  await expect(sheet.getByLabel('Title')).toHaveValue(/^MOCK/)
  await expect(sheet.getByRole('button', { name: 'School', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // The draft is editable and saves like anything else.
  await sheet.getByLabel('Title').fill('Edited after AI')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Edited after AI')

  // One use was counted.
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('ai-usage')).toContainText('9 of 10 AI uses left')
})

test('the Settings switch makes AI run as soon as a photo is chosen', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('switch', { name: 'Always let AI read my photos' }).check()
  await page.getByRole('button', { name: 'Done' }).click()

  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet.getByTestId('ai-panel')).toContainText('MOCK draft')
  await expect(sheet.getByLabel('Title')).toHaveValue(/^MOCK/)
})

test('at the limit the button is disabled but saving by hand still works', async ({ page }) => {
  // Use up all ten against the real server counter, then reload so the app
  // shows the numbers the server sends back.
  await spendAiUses(page, 10)
  await page.reload()
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await expect(sheet.getByRole('button', { name: 'Let AI fill this in' })).toBeDisabled()
  await expect(sheet.getByTestId('ai-panel')).toContainText('frees up in')

  await sheet.getByLabel('Title').fill('Still works')
  await sheet.getByRole('button', { name: 'Other', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Still works')
})

test('a signed-in request straight to the function without a photo is refused', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const token = localStorage.getItem('trophy-case.session')
    const res = await fetch('/api/read-photo', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ today: '2026-09-21' }),
    })
    return { status: res.status, json: await res.json() }
  })
  expect(body.status).toBe(400)
  expect(body.json).toMatchObject({ ok: false, message: 'No photo was sent.' })
})

test('a request with no sign-in is refused before the AI runs', async ({ request }) => {
  const res = await request.post('/api/read-photo', { data: { today: '2026-09-21' } })
  expect(res.status()).toBe(401)
  expect(await res.json()).toMatchObject({ ok: false, code: 'signin' })
})
