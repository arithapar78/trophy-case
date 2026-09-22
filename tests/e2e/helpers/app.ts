import type { Page } from '@playwright/test'
import { makePng } from './png'

export async function openFreshApp(page: Page) {
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
}

export function photoFile(name = 'win.png', width = 400, height = 300) {
  return { name, mimeType: 'image/png', buffer: makePng(width, height) }
}
