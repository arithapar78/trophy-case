// T6.6: the Pro plan, driven through the real app at iPhone size.
//
// The preview server has no Stripe keys, so Settings offers the clearly
// labelled pretend upgrade. That is the whole point of MOCK mode: the flow
// can be tested end to end without a Stripe account or a card.
//
// Phase 7 switched selling off, so this file runs against its own preview
// server started with ENABLE_PRO=1 (see playwright.config.ts, project
// "iphone-pro"). Nothing here ships today; it is kept working for the day it
// is switched back on. What users actually see is covered in scout.spec.ts.

import { expect, test } from '@playwright/test'
import { signInForTest } from './helpers/account'
import { openFreshApp, photoFile } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await openFreshApp(page)
})

test('signed out there is no upgrade offer', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })

  await expect(settings.getByTestId('account-section')).toContainText('Sign in to use the AI features')
  await expect(settings.getByTestId('plan-section')).toHaveCount(0)
  await expect(settings.getByTestId('upgrade')).toHaveCount(0)
})

test('upgrading moves the account to Pro and raises the limit', async ({ page }) => {
  await signInForTest(page, 'plan-upgrade')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })

  await expect(settings.getByTestId('plan-name')).toContainText('You are on Free')
  await expect(settings.getByTestId('plan-mock-note')).toBeVisible()

  await settings.getByTestId('upgrade').click()

  await expect(settings.getByTestId('plan-name')).toContainText('You are on Pro')
  // The offer is replaced by the way out.
  await expect(settings.getByTestId('upgrade')).toHaveCount(0)
  await expect(settings.getByTestId('manage-subscription')).toBeVisible()
})

test('the plan lives on the server, so clearing the app does not grant or lose it', async ({ page }) => {
  await signInForTest(page, 'plan-server')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByTestId('upgrade').click()
  await expect(settings.getByTestId('plan-name')).toContainText('You are on Pro')

  // Wipe everything the app keeps on the device except the sign-in itself.
  await page.evaluate(() => {
    const token = localStorage.getItem('trophy-case.session')
    localStorage.clear()
    if (token) localStorage.setItem('trophy-case.session', token)
  })
  await page.reload()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('plan-name')).toContainText('You are on Pro')
})

test('cancelling returns the account to Free, and the achievements are untouched throughout', async ({ page }) => {
  await signInForTest(page, 'plan-cancel')

  // Save a real achievement first, so we can prove it survives.
  await page.getByTestId('camera-input').setInputFiles(photoFile())
  const sheet = page.getByRole('dialog', { name: 'New achievement' })
  await sheet.getByLabel('Title').fill('Still here after upgrading')
  await sheet.getByRole('button', { name: 'Arts', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('achievement-card')).toContainText('Still here after upgrading')

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByTestId('upgrade').click()
  await expect(settings.getByTestId('plan-name')).toContainText('You are on Pro')

  await settings.getByTestId('manage-subscription').click()
  await expect(settings.getByTestId('plan-name')).toContainText('You are on Free')

  await settings.getByRole('button', { name: 'Close' }).first().click()
  await expect(page.getByTestId('achievement-card')).toContainText('Still here after upgrading')
})

test('the app never asks the server to change its own plan', async ({ page }) => {
  // The only routes that may touch a plan are the Stripe ones. If the app
  // ever started POSTing a plan somewhere else, this would catch it.
  const suspicious: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (req.method() === 'POST' && /plan|upgrade|pro\b/i.test(url) && !url.includes('/api/stripe/')) {
      suspicious.push(url)
    }
  })

  await signInForTest(page, 'plan-guard')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('upgrade').click()
  await expect(page.getByTestId('plan-name')).toContainText('You are on Pro')

  expect(suspicious).toEqual([])
})
