import { expect, type Page } from '@playwright/test'

// Every test gets its own account, so one test's AI uses never count
// against another's. The server keeps them in memory for the whole run.
export function uniqueEmail(name: string): string {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

// Signs in through the test-mode route (the same one the Settings sheet
// uses when there is no Google client id) and puts the token where the app
// looks for it.
export async function signInForTest(page: Page, name = 'test'): Promise<string> {
  const email = uniqueEmail(name)
  const token = await page.evaluate(async (address) => {
    const res = await fetch('/api/auth/dev', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: address }),
    })
    const body = (await res.json()) as { token?: string; message?: string }
    if (!body.token) throw new Error(body.message ?? 'Test sign-in failed')
    localStorage.setItem('trophy-case.session', body.token)
    return body.token
  }, email)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  return token
}

// Spends AI uses straight against the function, the way the app does, so a
// test can reach the limit without tapping the button ten times.
export async function spendAiUses(page: Page, count: number): Promise<void> {
  await page.evaluate(async (howMany) => {
    const token = localStorage.getItem('trophy-case.session')
    for (let i = 0; i < howMany; i++) {
      await fetch('/api/rank', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ goal: 'x', achievements: [] }),
      })
    }
  }, count)
}
