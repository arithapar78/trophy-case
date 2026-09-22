// The server-side AI limit: 10 uses per rolling 5 hours on Free, 100 on
// Pro. Reuses the same window logic the app used on the device, just with
// the store on the server so clearing the app cannot reset it.

import { WINDOW_MS, windowStatus, type UsageStatus } from '../src/lib/aiUsage.js'
import type { Plan, Store, User } from './store.js'

export const USES_PER_WINDOW: Record<Plan, number> = { free: 10, pro: 100 }

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
