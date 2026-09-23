import type { Page } from '@playwright/test'
import { makePng } from './png'

// A fresh device shows the hello card first (Phase 12). Most tests are
// about something else, so close it unless the test asks to keep it.
export async function openFreshApp(page: Page, { keepHello = false } = {}) {
  await page.goto('/')
  // Each test starts with an empty timeline.
  await page.evaluate(() => {
    localStorage.clear()
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('trophy-case')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })
  await page.reload()
  if (!keepHello) await closeHello(page)
}

export async function closeHello(page: Page) {
  await page.getByTestId('hello-done').click()
  await page.getByTestId('hello-card').waitFor({ state: 'hidden' })
}

export function photoFile(name = 'win.png', width = 400, height = 300) {
  return { name, mimeType: 'image/png', buffer: makePng(width, height) }
}
