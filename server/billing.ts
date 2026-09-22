// Applying what Stripe tells us to an account, and the MOCK mode that lets
// the whole upgrade flow be built and tested without a Stripe account.
//
// The rule this file exists to enforce: only a verified message from Stripe
// changes a plan. No request from a phone can.

import { isProduction } from './storeInstance.js'
import { stripeConfigured } from './stripe.js'
import type { PlanChange } from './stripe.js'
import type { Store, User } from './store.js'

// With no Stripe keys set, and not on the live site, Settings offers a
// clearly labelled pretend upgrade. This is what makes the tests possible
// without touching Stripe, and it can never happen in production.
export function mockBillingAllowed(): boolean {
  return proEnabled() && !stripeConfigured() && !isProduction()
}

// Phase 7 switched selling off: with no users yet there is nothing to sell,
// and a price tag in front of someone who has not seen the app work sends
// them away. Every line of the Stripe code stays and keeps being tested;
// this one switch decides whether the app offers anything. Set ENABLE_PRO=1
// on the server to bring it back.
export function proEnabled(): boolean {
  const value = process.env.ENABLE_PRO
  return value === '1' || value === 'true'
}

// Finds the account a Stripe message is about, by the user id Stripe echoed
// back to us, falling back to the Stripe customer id we stored earlier.
export async function findUserForChange(store: Store, change: PlanChange): Promise<User | undefined> {
  if (change.userId) {
    const byId = await store.getUser(change.userId)
    if (byId) return byId
  }
  return store.getUserByStripeCustomer(change.stripeCustomerId)
}

export async function applyPlanChange(store: Store, change: PlanChange): Promise<User | undefined> {
  const user = await findUserForChange(store, change)
  if (!user) return undefined
  const updated: User = {
    ...user,
    plan: change.plan,
    stripeCustomerId: change.stripeCustomerId,
    subscriptionStatus: change.status,
  }
  await store.putUser(updated)
  return updated
}

export async function setPlanForTestingOrMock(store: Store, user: User, plan: 'free' | 'pro'): Promise<User> {
  const updated: User = {
    ...user,
    plan,
    subscriptionStatus: plan === 'pro' ? 'active' : 'canceled',
  }
  await store.putUser(updated)
  return updated
}
