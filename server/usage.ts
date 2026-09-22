// The server-side AI ceiling.
//
// This is NOT a product limit and the app never shows it. It is a circuit
// breaker: the AI functions are reachable by anyone with a browser, so
// without some ceiling one script could run up the whole Anthropic bill.
// A student doing a real sitting of work takes maybe a dozen AI actions; a
// script takes thousands. 300 per rolling 5 hours sits far above the first
// and far below the second.
//
// When there is something to sell again, give the two plans different
// numbers here and set ENABLE_PRO on the server. Nothing else changes.

import { WINDOW_MS, windowStatus, type UsageStatus } from '../src/lib/aiUsage.js'
import type { Plan, Store, User } from './store.js'

export const OPEN_CEILING = 300

export const USES_PER_WINDOW: Record<Plan, number> = { free: OPEN_CEILING, pro: OPEN_CEILING }

export interface UsageCheck {
  ok: boolean
  usage: UsageStatus
}

export async function getUsageFor(store: Store, user: User, now = Date.now()): Promise<UsageStatus> {
  return windowStatus(await store.readUsage(user.id), USES_PER_WINDOW[user.plan], now)
}

// Records one use if there is room. Returns the status after the attempt.
export async function useOne(store: Store, user: User, now = Date.now()): Promise<UsageCheck> {
  const limit = USES_PER_WINDOW[user.plan]
  const times = (await store.readUsage(user.id)).filter((t) => t > now - WINDOW_MS && t <= now)
  if (times.length >= limit) return { ok: false, usage: windowStatus(times, limit, now) }
  const next = [...times, now]
  await store.writeUsage(user.id, next)
  return { ok: true, usage: windowStatus(next, limit, now) }
}
