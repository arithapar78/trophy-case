// Phase 6 tests: the Pro plan. Checking that a message really came from
// Stripe, that the right messages flip the right plan, that a repeat does
// nothing, and that the plan's ceiling is enforced.
//
// Phase 7 switched selling off and gave both plans the same ceiling, so
// these tests set ENABLE_PRO themselves. The machinery still has to work
// for the day it is switched back on.
//
// All of it runs against the in-memory store with fake Stripe messages, so
// no Stripe account, no keys and no network.

import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { signIn } from '../../server/auth'
import { applyPlanChange } from '../../server/billing'
import { memoryStore, type Store, type User } from '../../server/store'
import { setStoreForTests } from '../../server/storeInstance'
import {
  encodeParams,
  parseEvent,
  planChangeFromEvent,
  signPayload,
  verifyStripeSignature,
} from '../../server/stripe'
import { USES_PER_WINDOW, useOne } from '../../server/usage'
import checkoutHandler from '../../api/stripe/checkout'
import webhookHandler from '../../api/stripe/webhook'

const WEBHOOK_SECRET = 'whsec_test_secret'
const NOW = 1_800_000_000_000 // a fixed moment, so the tests never drift

let store: Store

beforeEach(() => {
  store = memoryStore()
  setStoreForTests(store)
  // Phase 7 switched selling off by default. These tests are about the
  // Stripe machinery, so they switch it back on.
  process.env.ENABLE_PRO = '1'
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  process.env.STRIPE_PRICE_ID = 'price_fake'
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
})

afterEach(() => {
  setStoreForTests(undefined)
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_PRICE_ID
  delete process.env.STRIPE_WEBHOOK_SECRET
  delete process.env.VERCEL_ENV
  delete process.env.ENABLE_PRO
})

interface FakeResponse extends ServerResponse {
  sent: { status: number; body: Record<string, unknown> }
}

function fakeResponse(): FakeResponse {
  const res = {
    statusCode: 200,
    setHeader() {},
    end(text: string) {
      res.sent = { status: res.statusCode, body: JSON.parse(text) }
    },
    sent: { status: 0, body: {} },
  }
  return res as unknown as FakeResponse
}

// A POST to the webhook, signed the way Stripe signs its own.
function webhookRequest(
  payload: string,
  options: { secret?: string; header?: string; at?: number } = {},
): IncomingMessage {
  const req = Readable.from([payload]) as unknown as IncomingMessage
  req.method = 'POST'
  const at = Math.floor((options.at ?? Date.now()) / 1000)
  const header = options.header ?? signPayload(payload, options.secret ?? WEBHOOK_SECRET, at)
  req.headers = { 'stripe-signature': header }
  return req
}

function checkoutSessionEvent(id: string, userId: string, customerId = 'cus_123'): string {
  return JSON.stringify({
    id,
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', customer: customerId, client_reference_id: userId } },
  })
}

function subscriptionEvent(id: string, status: string, customerId = 'cus_123', type = 'customer.subscription.updated'): string {
  return JSON.stringify({
    id,
    type,
    data: { object: { customer: customerId, status, metadata: {} } },
  })
}

async function proUser(): Promise<User> {
  const { user } = await signIn(store, 'ari@example.com')
  await store.putUser({ ...user, plan: 'pro', stripeCustomerId: 'cus_123' })
  return (await store.getUser(user.id)) as User
}

describe('T6.1 only Stripe can talk to the webhook', () => {
  it('accepts a correctly signed message', () => {
    const payload = '{"id":"evt_1"}'
    const header = signPayload(payload, WEBHOOK_SECRET, Math.floor(NOW / 1000))
    expect(verifyStripeSignature(payload, header, WEBHOOK_SECRET, NOW)).toBe(true)
  })

  it('refuses a wrong secret, a tampered body, a missing header and rubbish', () => {
    const payload = '{"id":"evt_1"}'
    const good = signPayload(payload, WEBHOOK_SECRET, Math.floor(NOW / 1000))

    expect(verifyStripeSignature(payload, good, 'whsec_a_different_secret', NOW)).toBe(false)
    expect(verifyStripeSignature('{"id":"evt_TAMPERED"}', good, WEBHOOK_SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(payload, undefined, WEBHOOK_SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(payload, 'not-a-signature', WEBHOOK_SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(payload, 't=abc,v1=zzz', WEBHOOK_SECRET, NOW)).toBe(false)
  })

  it('refuses a signature that is too old, so a captured message cannot be replayed', () => {
    const payload = '{"id":"evt_1"}'
    const sixMinutesAgo = Math.floor(NOW / 1000) - 6 * 60
    const header = signPayload(payload, WEBHOOK_SECRET, sixMinutesAgo)
    expect(verifyStripeSignature(payload, header, WEBHOOK_SECRET, NOW)).toBe(false)
  })

  it('ignores the fake v0 signature Stripe adds to test events', () => {
    const payload = '{"id":"evt_1"}'
    const t = Math.floor(NOW / 1000)
    expect(verifyStripeSignature(payload, `t=${t},v0=deadbeef`, WEBHOOK_SECRET, NOW)).toBe(false)
  })

  it('the route refuses a bad signature with a 400 and changes nothing', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const payload = checkoutSessionEvent('evt_bad', user.id)
    const res = fakeResponse()
    await webhookHandler(webhookRequest(payload, { secret: 'whsec_wrong' }), res)

    expect(res.sent.status).toBe(400)
    expect((await store.getUser(user.id))?.plan).toBe('free')
  })

  it('the route refuses a GET', async () => {
    const req = Readable.from(['']) as unknown as IncomingMessage
    req.method = 'GET'
    req.headers = {}
    const res = fakeResponse()
    await webhookHandler(req, res)
    expect(res.sent.status).toBe(405)
  })
})

describe('T6.2 the right messages flip the right plan', () => {
  it('a completed subscription checkout makes the account Pro and remembers the customer', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const res = fakeResponse()
    await webhookHandler(webhookRequest(checkoutSessionEvent('evt_1', user.id, 'cus_abc')), res)

    expect(res.sent.status).toBe(200)
    const after = await store.getUser(user.id)
    expect(after?.plan).toBe('pro')
    expect(after?.stripeCustomerId).toBe('cus_abc')
  })

  it('a cancelled subscription puts the account back on Free', async () => {
    const user = await proUser()
    const res = fakeResponse()
    await webhookHandler(
      webhookRequest(subscriptionEvent('evt_2', 'canceled', 'cus_123', 'customer.subscription.deleted')),
      res,
    )

    expect((await store.getUser(user.id))?.plan).toBe('free')
  })

  it('keeps Pro while Stripe is retrying a failed card, drops it when the subscription ends', () => {
    const stillPro = planChangeFromEvent(parseEvent(subscriptionEvent('e', 'past_due'))!)
    expect(stillPro?.plan).toBe('pro')

    const unpaid = planChangeFromEvent(parseEvent(subscriptionEvent('e', 'unpaid'))!)
    expect(unpaid?.plan).toBe('free')
  })

  it('ignores messages it does not act on, and a one-off payment', () => {
    expect(planChangeFromEvent({ type: 'invoice.created', data: { object: { customer: 'cus_1' } } })).toBeUndefined()
    expect(
      planChangeFromEvent({
        type: 'checkout.session.completed',
        data: { object: { mode: 'payment', customer: 'cus_1' } },
      }),
    ).toBeUndefined()
  })

  it('a message about an account that no longer exists is accepted and changes nothing', async () => {
    const res = fakeResponse()
    await webhookHandler(webhookRequest(checkoutSessionEvent('evt_ghost', 'no-such-user', 'cus_ghost')), res)
    expect(res.sent.status).toBe(200)
    expect(res.sent.body.unknownAccount).toBe(true)
  })
})

describe('T6.3 the same message twice changes the account once', () => {
  it('handles a repeat delivery without acting on it again', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const payload = checkoutSessionEvent('evt_same', user.id, 'cus_abc')

    const first = fakeResponse()
    await webhookHandler(webhookRequest(payload), first)
    expect(first.sent.body.plan).toBe('pro')

    // Meanwhile something else downgraded the account. A repeat of the old
    // message must not quietly upgrade it again.
    await applyPlanChange(store, { plan: 'free', stripeCustomerId: 'cus_abc', userId: user.id, status: 'canceled' })

    const second = fakeResponse()
    await webhookHandler(webhookRequest(payload), second)
    expect(second.sent.status).toBe(200)
    expect(second.sent.body.repeat).toBe(true)
    expect((await store.getUser(user.id))?.plan).toBe('free')
  })
})

// Phase 7 gave every account the same ceiling, so this no longer asserts
// that Pro gets more than Free. What still has to hold is that the plan
// decides the number and the server enforces whatever that number is, which
// is the part Phase 6 built and the part that has to keep working for the
// day selling is switched back on.
describe('T6.4 the plan decides the ceiling and the server enforces it', () => {
  it('allows exactly the plan ceiling on Pro and refuses the next one', async () => {
    const user = await proUser()
    const limit = USES_PER_WINDOW.pro

    for (let i = 0; i < limit; i += 1) {
      expect((await useOne(store, user, NOW)).ok).toBe(true)
    }
    const overTheLine = await useOne(store, user, NOW)
    expect(overTheLine.ok).toBe(false)
    expect(overTheLine.usage.limit).toBe(limit)
    expect(overTheLine.usage.remaining).toBe(0)
  })

  it('does the same for Free, at that plan own number', async () => {
    const { user } = await signIn(store, 'free@example.com')
    const limit = USES_PER_WINDOW.free
    for (let i = 0; i < limit; i += 1) expect((await useOne(store, user, NOW)).ok).toBe(true)
    expect((await useOne(store, user, NOW)).ok).toBe(false)
  })

  it('the ceiling is high enough not to read as a paywall', () => {
    // Phase 7's whole point. If someone lowers this to a handful, the app is
    // metering again and this test should stop them.
    expect(USES_PER_WINDOW.free).toBeGreaterThanOrEqual(100)
    expect(USES_PER_WINDOW.free).toBe(USES_PER_WINDOW.pro)
  })
})

describe('T6.5 the upgrade route needs a sign-in', () => {
  it('refuses with no token', async () => {
    const req = Readable.from(['{}']) as unknown as IncomingMessage
    req.method = 'POST'
    req.headers = {}
    const res = fakeResponse()
    await checkoutHandler(req, res)

    expect(res.sent.status).toBe(401)
    expect(res.sent.body.code).toBe('signin')
  })

  it('refuses a GET', async () => {
    const req = Readable.from(['']) as unknown as IncomingMessage
    req.method = 'GET'
    req.headers = {}
    const res = fakeResponse()
    await checkoutHandler(req, res)
    expect(res.sent.status).toBe(405)
  })

  it('the pretend upgrade works with no Stripe keys, and is refused on the live site', async () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_ID
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { token, user } = await signIn(store, 'ari@example.com')
    const req = Readable.from(['{}']) as unknown as IncomingMessage
    req.method = 'POST'
    req.headers = { authorization: `Bearer ${token}`, host: 'localhost:4173' }
    const res = fakeResponse()
    await checkoutHandler(req, res)

    expect(res.sent.body.mock).toBe(true)
    expect((await store.getUser(user.id))?.plan).toBe('pro')

    // Same request, but this is the live site: no pretending.
    process.env.VERCEL_ENV = 'production'
    const { token: liveToken } = await signIn(store, 'live@example.com')
    const liveReq = Readable.from(['{}']) as unknown as IncomingMessage
    liveReq.method = 'POST'
    liveReq.headers = { authorization: `Bearer ${liveToken}` }
    const liveRes = fakeResponse()
    await checkoutHandler(liveReq, liveRes)

    expect(liveRes.sent.status).toBe(503)
  })
})

describe('the form encoding Stripe expects', () => {
  it('flattens nested values into bracketed names', () => {
    expect(
      encodeParams({
        mode: 'subscription',
        line_items: { 0: { price: 'price_1', quantity: 1 } },
        metadata: { userId: 'u-1' },
        customer: undefined,
      }),
    ).toEqual([
      'mode=subscription',
      'line_items%5B0%5D%5Bprice%5D=price_1',
      'line_items%5B0%5D%5Bquantity%5D=1',
      'metadata%5BuserId%5D=u-1',
    ])
  })
})
