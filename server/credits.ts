// Phase 14: counting monthly AI credits on the server. The numbers and the
// wording live in src/lib/credits.ts, shared with the app.

import { CREDITS_PER_MONTH, creditStatus, monthKey, type CreditStatus } from '../src/lib/credits.js'
import type { Store, User } from './store.js'

export async function getCreditsFor(store: Store, user: User, now = Date.now()): Promise<CreditStatus> {
  const used = await store.readCredits(user.id, monthKey(now))
  return creditStatus(used, CREDITS_PER_MONTH[user.plan], now)
}

export function canAfford(status: CreditStatus, cost: number): boolean {
  return status.remaining >= cost
}

// Charged only after the AI has answered, so a failed call costs nothing.
export async function spendCredits(store: Store, user: User, cost: number, now = Date.now()): Promise<CreditStatus> {
  const used = await store.addCredits(user.id, monthKey(now), cost)
  return creditStatus(used, CREDITS_PER_MONTH[user.plan], now)
}
