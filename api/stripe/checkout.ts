// POST /api/stripe/checkout
// Starts an upgrade. Answers with the address of Stripe's own payment page,
// which the app then sends the user to. No card details come near this app.
//
// With no Stripe keys set (local development), this flips the plan straight
// to Pro and says so, so the rest of the app can be built and tested without
// a Stripe account. That shortcut is refused on the live site.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticate } from '../../server/auth.js'
import { mockBillingAllowed, setPlanForTestingOrMock } from '../../server/billing.js'
import { sendJson } from '../../server/http.js'
import { getStore } from '../../server/storeInstance.js'
import { createCheckoutSession, stripeConfig } from '../../server/stripe.js'

// Where to send the user back to. Taken from the request, because the app
// runs on localhost, on the Vercel URL, and one day on its own domain.
export function originOf(req: IncomingMessage): string {
  const forwardedHost = req.headers['x-forwarded-host']
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ?? req.headers.host ?? 'localhost'
  const forwardedProto = req.headers['x-forwarded-proto']
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const store = getStore()
  const user = await authenticate(store, req)
  if (!user) {
    sendJson(res, 401, { ok: false, code: 'signin', message: 'Sign in before upgrading.' })
    return
  }
  if (user.plan === 'pro') {
    sendJson(res, 200, { ok: true, alreadyPro: true })
    return
  }

  const config = stripeConfig()
  if (!config) {
    if (!mockBillingAllowed()) {
      sendJson(res, 503, { ok: false, message: 'Upgrading is not set up yet. Try again later.' })
      return
    }
    await setPlanForTestingOrMock(store, user, 'pro')
    sendJson(res, 200, { ok: true, mock: true })
    return
  }

  try {
    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      origin: originOf(req),
      config,
    })
    sendJson(res, 200, { ok: true, url })
  } catch {
    sendJson(res, 502, { ok: false, message: 'Could not reach the payment page. Try again in a moment.' })
  }
}
