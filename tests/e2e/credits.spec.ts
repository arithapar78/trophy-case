import { expect, test } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('T14.3 Settings shows this month\'s credits, a Scout message costs 1, and nothing nags while plenty are left', async ({ page }) => {
  await signInForTest(page, 'credits')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('account-credits')).toContainText('50 of 50 AI credits left this month')
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Scout', exact: true }).click()
  await page.getByRole('textbox').last().fill('What should I do next?')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByTestId('scout-reply').last()).toBeVisible()
  await expect(page.getByTestId('credits-low')).toHaveCount(0)

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('account-credits')).toContainText('49 of 50')
})

test('T14.4 running low shows a quiet note, and at zero the AI refuses politely', async ({ page }) => {
  await signInForTest(page, 'credits-low')
  // Spend 48 straight against the function (16 summaries at 3 each).
  const last = await page.evaluate(async () => {
    const token = localStorage.getItem('trophy-case.session')
    const body = JSON.stringify({ goal: '', achievements: [{ id: 'a', title: 'Science fair', category: 'School', date: '2026-01-01', note: '', organisation: '', role: '', result: '' }] })
    let json: unknown
    for (let i = 0; i < 17; i++) {
      const res = await fetch('/api/summary', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body })
      json = { status: res.status, body: await res.json() }
    }
    return json as { status: number; body: { code?: string; message?: string } }
  })
  // 16 fit (48 credits); the 17th needs 3 with only 2 left.
  expect(last.status).toBe(429)
  expect(last.body.code).toBe('credits')
  expect(last.body.message).toContain('needs 3')

  await page.reload()
  await page.getByRole('tab', { name: 'Scout', exact: true }).click()
  await expect(page.getByTestId('credits-low')).toContainText('2 AI credits left this month')
})
