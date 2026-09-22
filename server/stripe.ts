// Talking to Stripe, without the Stripe library.
//
// Stripe's API is an ordinary HTTPS API that takes form-encoded parameters,
// so a small `fetch` wrapper does everything we need and there is one less
// dependency to understand. The only fiddly part is checking that a message
// really came from Stripe, which is the signature check at the bottom.
//
// The secret key never leaves this file's environment. It is not in the app
// the phone downloads.

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Plan } from './store.js'

export const PRO_PRICE_TEXT = '$10 a month'

// Stripe keeps a subscription in `past_due` while it retries a card that
// failed. We keep those accounts on Pro rather than cutting someone off in
// the middle of an application over a card that expired.
const PRO_STATUSES = new Set(['active', 'trialing', 'past_due'])

export interface StripeConfig {
  secretKey: string
  priceId: string
  webhookSecret: string
}

// All three or nothing. A half-configured Stripe is worse than none, because
// checkout would work and the plan would never arrive.
export function stripeConfig(): StripeConfig | undefined {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !priceId || !webhookSecret) return undefined
  return { secretKey, priceId, webhookSecret }
}

export function stripeConfigured(): boolean {
  return stripeConfig() !== undefined
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

// Stripe takes nested values as bracketed names:
//   line_items[0][price]=price_123
export function encodeParams(params: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (typeof value === 'object') {
      parts.push(...encodeParams(value as Record<string, unknown>, name))
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts
}

export async function stripeApi(
  path: string,
  params: Record<string, unknown>,
  secretKey: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: encodeParams(params).join('&'),
  })
  const body = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const error = body.error as { message?: string } | undefined
    throw new Error(error?.message ?? `Stripe returned ${response.status}.`)
  }
  return body
}

export interface CheckoutOptions {
  userId: string
  email: string
  stripeCustomerId?: string
  origin: string
  config: StripeConfig
  fetchImpl?: FetchLike
}

// The hosted payment page. We send the user id along twice, as
// client_reference_id and in the subscription's metadata, so that whichever
// message comes back we can find the account it belongs to.
export async function createCheckoutSession(options: CheckoutOptions): Promise<string> {
  const session = await stripeApi(
    'checkout/sessions',
    {
      mode: 'subscription',
      line_items: { 0: { price: options.config.priceId, quantity: 1 } },
      success_url: `${options.origin}/?billing=success`,
      cancel_url: `${options.origin}/?billing=cancelled`,
      client_reference_id: options.userId,
      // Reuse the customer if they have paid before, so they do not end up
      // with two Stripe customers and two subscriptions.
      customer: options.stripeCustomerId,
      customer_email: options.stripeCustomerId ? undefined : options.email,
      metadata: { userId: options.userId },
      subscription_data: { metadata: { userId: options.userId } },
    },
    options.config.secretKey,
    options.fetchImpl,
  )
  const url = session.url
  if (typeof url !== 'string') throw new Error('Stripe did not return a payment page.')
  return url
}

export async function createPortalSession(
  stripeCustomerId: string,
  origin: string,
  config: StripeConfig,
  fetchImpl?: FetchLike,
): Promise<string> {
  const session = await stripeApi(
    'billing_portal/sessions',
    { customer: stripeCustomerId, return_url: `${origin}/?billing=portal` },
    config.secretKey,
    fetchImpl,
  )
  const url = session.url
  if (typeof url !== 'string') throw new Error('Stripe did not return a portal page.')
  return url
}

// --- Is this message really from Stripe? ---
//
// Anyone on the internet can POST to our webhook URL claiming a payment
// happened. Stripe signs every message it sends with a secret only Stripe
// and this server know, so we recompute the signature and compare. Think of
// it as a wax seal: anyone can post us a letter, only Stripe can seal one.

export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

export function verifyStripeSignature(
  payload: string,
  header: string | undefined,
  webhookSecret: string,
  now: number = Date.now(),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!header) return false

  let timestamp: string | undefined
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=')
    if (key === 't') timestamp = value
    // Only the v1 scheme counts. v0 is a fake Stripe adds to test events,
    // and accepting unknown schemes is how you get talked down to a weaker one.
    else if (key === 'v1' && value) signatures.push(value)
  }
  if (!timestamp || signatures.length === 0) return false

  const sentAt = Number(timestamp)
  if (!Number.isFinite(sentAt)) return false
  // Too old means someone may be replaying a message they captured earlier.
  if (Math.abs(now / 1000 - sentAt) > toleranceSeconds) return false

  const expected = createHmac('sha256', webhookSecret).update(`${timestamp}.${payload}`).digest('hex')
  return signatures.some((candidate) => equalInConstantTime(candidate, expected))
}

// Comparing with === leaks, through how long it takes, how much of the
// signature a guess got right. This always takes the same time.
function equalInConstantTime(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

// Used by the tests, and handy if a signature ever needs debugging.
export function signPayload(payload: string, webhookSecret: string, timestampSeconds: number): string {
  const signature = createHmac('sha256', webhookSecret).update(`${timestampSeconds}.${payload}`).digest('hex')
  return `t=${timestampSeconds},v1=${signature}`
}

// --- What a message means ---

export interface StripeEvent {
  id?: string
  type?: string
  data?: { object?: Record<string, unknown> }
}

export interface PlanChange {
  plan: Plan
  stripeCustomerId: string
  // Stripe echoes back the user id we sent at checkout. Present on the
  // events we subscribe to; the customer id is the fallback.
  userId?: string
  status?: string
}

export function parseEvent(payload: string): StripeEvent | undefined {
  try {
    const parsed: unknown = JSON.parse(payload)
    return parsed && typeof parsed === 'object' ? (parsed as StripeEvent) : undefined
  } catch {
    return undefined
  }
}

// Turns one Stripe message into "this account should now be on this plan",
// or undefined for the messages we do not care about.
export function planChangeFromEvent(event: StripeEvent): PlanChange | undefined {
  const object = event.data?.object
  if (!object) return undefined
  const stripeCustomerId = typeof object.customer === 'string' ? object.customer : undefined
  if (!stripeCustomerId) return undefined
  const metadata = object.metadata as { userId?: unknown } | undefined
  const fromMetadata = typeof metadata?.userId === 'string' ? metadata.userId : undefined
  const fromReference = typeof object.client_reference_id === 'string' ? object.client_reference_id : undefined
  const userId = fromReference ?? fromMetadata
  const status = typeof object.status === 'string' ? object.status : undefined

  switch (event.type) {
    case 'checkout.session.completed':
      // Only a subscription checkout grants Pro.
      if (object.mode !== 'subscription') return undefined
      return { plan: 'pro', stripeCustomerId, userId, status: 'active' }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return { plan: status && PRO_STATUSES.has(status) ? 'pro' : 'free', stripeCustomerId, userId, status }
    case 'customer.subscription.deleted':
      return { plan: 'free', stripeCustomerId, userId, status: status ?? 'canceled' }
    default:
      return undefined
  }
}
