// POST /api/stripe/portal
// Answers with the address of Stripe's own subscription page, where the user
// can change their card or cancel. Stripe runs that page, not us, so we
// never handle a cancellation or a card change ourselves.
//
// In MOCK mode (no Stripe keys, not the live site) it cancels straight away,
// so the downgrade path can be tested.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticate } from '../../server/auth.js'
import { mockBillingAllowed, setPlanForTestingOrMock } from '../../server/billing.js'
import { sendJson } from '../../server/http.js'
import { getStore } from '../../server/storeInstance.js'
import { createPortalSession, stripeConfig } from '../../server/stripe.js'
import { originOf } from './checkout.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const store = getStore()
  const user = await authenticate(store, req)
  if (!user) {
    sendJson(res, 401, { ok: false, code: 'signin', message: 'Sign in first.' })
    return
  }

  const config = stripeConfig()
  if (!config) {
    if (!mockBillingAllowed()) {
      sendJson(res, 503, { ok: false, message: 'Subscriptions are not set up yet.' })
      return
    }
    await setPlanForTestingOrMock(store, user, 'free')
    sendJson(res, 200, { ok: true, mock: true })
    return
  }

  if (!user.stripeCustomerId) {
    sendJson(res, 400, { ok: false, message: 'There is no subscription on this account yet.' })
    return
  }

  try {
    const url = await createPortalSession(user.stripeCustomerId, originOf(req), config)
    sendJson(res, 200, { ok: true, url })
  } catch {
    sendJson(res, 502, { ok: false, message: 'Could not open the subscription page. Try again in a moment.' })
  }
}
