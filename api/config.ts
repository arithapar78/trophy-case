// GET /api/config
// What the app needs to know about this server before signing in: the
// Google client id (public, not a secret), whether test-mode sign-in is on,
// and whether accounts are set up at all. No secrets ever come through here.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../server/http.js'
import { mockBillingAllowed } from '../server/billing.js'
import { accountsReady, isProduction } from '../server/storeInstance.js'
import { PRO_PRICE_TEXT, stripeConfigured } from '../server/stripe.js'

export function devLoginAllowed(): boolean {
  return !process.env.GOOGLE_CLIENT_ID && !isProduction()
}

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  sendJson(res, 200, {
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    devLogin: devLoginAllowed(),
    accountsReady: accountsReady(),
    billing: {
      available: stripeConfigured() || mockBillingAllowed(),
      mock: mockBillingAllowed(),
      priceText: PRO_PRICE_TEXT,
    },
  })
}
