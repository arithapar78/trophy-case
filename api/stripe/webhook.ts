// POST /api/stripe/webhook
// The only thing in the whole app that is allowed to change an account's
// plan. Stripe posts here when someone pays, changes a card, or cancels.
//
// Anyone on the internet can post here claiming a payment happened, so the
// first thing we do is check Stripe's signature. Without a good signature
// nothing is read and nothing changes.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { applyPlanChange } from '../../server/billing.js'
import { readWebhookBody, sendJson } from '../../server/http.js'
import { getStore } from '../../server/storeInstance.js'
import { parseEvent, planChangeFromEvent, stripeConfig, verifyStripeSignature } from '../../server/stripe.js'

// Vercel parses JSON bodies by default, which would destroy the exact bytes
// the signature covers. This turns that off for this one route.
export const config = { api: { bodyParser: false } }

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const settings = stripeConfig()
  if (!settings) {
    sendJson(res, 503, { ok: false, message: 'Stripe is not set up on this server.' })
    return
  }

  const payload = await readWebhookBody(req)
  if (payload === undefined) {
    sendJson(res, 400, { ok: false, message: 'Could not read the message body.' })
    return
  }

  const signature = req.headers['stripe-signature']
  const header = Array.isArray(signature) ? signature[0] : signature
  if (!verifyStripeSignature(payload, header, settings.webhookSecret)) {
    sendJson(res, 400, { ok: false, message: 'Bad signature.' })
    return
  }

  const event = parseEvent(payload)
  if (!event) {
    sendJson(res, 400, { ok: false, message: 'Could not read the message.' })
    return
  }

  const store = getStore()

  // Stripe can deliver the same message twice. Handling it once is enough.
  // (Applying a change is "set the plan to this value", so a repeat would be
  // harmless anyway. This just saves the work and keeps the logs honest.)
  if (event.id) {
    const first = await store.markEventSeen(event.id)
    if (!first) {
      sendJson(res, 200, { ok: true, repeat: true })
      return
    }
  }

  const change = planChangeFromEvent(event)
  if (!change) {
    // A message we do not act on. Answer 200 so Stripe stops retrying it.
    sendJson(res, 200, { ok: true, ignored: event.type ?? 'unknown' })
    return
  }

  const user = await applyPlanChange(store, change)
  if (!user) {
    // The account was probably deleted. Nothing to do, and retrying will not
    // help, so tell Stripe we are done with this one.
    sendJson(res, 200, { ok: true, unknownAccount: true })
    return
  }
  sendJson(res, 200, { ok: true, plan: user.plan })
}
