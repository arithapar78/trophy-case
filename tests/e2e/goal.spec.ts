import { expect, test } from '@playwright/test'
import { openFreshApp } from './helpers/app'

async function addQuick(page: import('@playwright/test').Page, title: string, category: string) {
  await page.getByRole('button', { name: 'Add without a photo' }).click()
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: category, exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('the Ranked view asks for a goal first, then ranks against MOCK with reasons', async ({ page }) => {
  await addQuick(page, 'Robotics club', 'School')
  await addQuick(page, 'Debate final', 'Debate')

  await page.getByRole('tab', { name: 'Ranked' }).click()
  await expect(page.getByText('Set a goal first')).toBeVisible()
  await page.getByRole('button', { name: 'Set my goal' }).click()

  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByLabel('Goal').fill('Get into a top engineering school')
  await settings.getByRole('button', { name: 'Save goal' }).click()
  await expect(settings.getByRole('button', { name: 'Goal saved' })).toBeVisible()
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('goal-line')).toContainText('Get into a top engineering school')
  await expect(page.getByTestId('ranked-row')).toHaveCount(2)
  await expect(page.getByTestId('ranked-row').first()).toContainText('Not ranked yet')

  await page.getByRole('button', { name: 'Rank my achievements' }).click()
  await expect(page.getByRole('status')).toContainText('MOCK results')
  const rows = page.getByTestId('ranked-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('1')
  await expect(rows.first()).toContainText('MOCK: sample reason')
  await expect(rows.nth(1)).toContainText('2')

  // A new achievement shows as not ranked; nothing runs on its own.
  await addQuick(page, 'Bake sale', 'Cooking')
  await page.getByRole('tab', { name: 'Ranked' }).click()
  await expect(page.getByTestId('ranked-row')).toHaveCount(3)
  await expect(page.getByText('(1 not ranked yet)')).toBeVisible()

  // Recommendations: three, with a reason each.
  await page.getByRole('button', { name: 'What should I do next?' }).click()
  const recs = page.getByTestId('recommendations')
  await expect(recs.locator('li')).toHaveCount(3)
  await expect(recs).toContainText('MOCK')

  // Two AI uses were counted.
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('ai-usage')).toContainText('8 of 10')
})

test('rankings and the goal survive a reload', async ({ page }) => {
  await addQuick(page, 'Robotics club', 'School')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Goal').fill('Engineering')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('tab', { name: 'Ranked' }).click()
  await page.getByRole('button', { name: 'Rank my achievements' }).click()
  await expect(page.getByTestId('ranked-row').first()).toContainText('MOCK: sample reason')

  await page.reload()
  await page.getByRole('tab', { name: 'Ranked' }).click()
  await expect(page.getByTestId('goal-line')).toContainText('Engineering')
  await expect(page.getByTestId('ranked-row').first()).toContainText('MOCK: sample reason')
})

test('export as text and as PDF download files with the achievements in them', async ({ page }) => {
  await addQuick(page, 'Exported win', 'Arts')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })

  const textDownload = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Export as text' }).click()
  const text = await textDownload
  expect(text.suggestedFilename()).toMatch(/^trophy-case-\d{4}-\d{2}-\d{2}\.txt$/)
  const textBody = await streamToString(await text.createReadStream())
  expect(textBody).toContain('Exported win')

  const pdfDownload = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Export as PDF' }).click()
  const pdf = await pdfDownload
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/)
  const pdfBody = await streamToString(await pdf.createReadStream())
  expect(pdfBody.startsWith('%PDF-1.4')).toBe(true)
  expect(pdfBody).toContain('(Exported win) Tj')
})

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer))
  return Buffer.concat(chunks).toString('utf8')
}
