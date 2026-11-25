// Phase 14: monthly AI credits. Shared by the server (which counts them) and
// the app (which shows them), so the two can never disagree on the numbers.
//
// Why credits: every AI answer is paid for from one Anthropic account. The
// 5-hour ceiling (server/usage.ts) stops a runaway script; credits stop the
// slow leak of thousands of ordinary users each using a little more than
// they need. Each plan gets a monthly allowance that resets on the 1st.

export type CreditPlan = 'free' | 'pro'

export const CREDITS_PER_MONTH: Record<CreditPlan, number> = { free: 50, pro: 500 }

// What each AI action costs. A summary reads every achievement and writes
// a longer answer, so it costs more than a single photo or chat message.
export type AiAction = 'photo' | 'scout' | 'rank' | 'recommend' | 'summary'
export const CREDIT_COST: Record<AiAction, number> = { photo: 1, scout: 1, rank: 1, recommend: 1, summary: 3 }

// Below this share left, the app starts mentioning the count. Above it, the
// count stays in Settings only, so credits never feel like a paywall.
export const LOW_CREDIT_SHARE = 0.2

export interface CreditStatus {
  used: number
  limit: number
  remaining: number
  // Midnight UTC on the 1st of next month, when the allowance refills.
  resetsAt: number
}

// "2026-11". Months are counted in UTC so the reset is the same moment for
// everyone and does not depend on the server's timezone.
export function monthKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 7)
}

export function nextResetAt(now: number = Date.now()): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

export function creditStatus(used: number, limit: number, now: number = Date.now()): CreditStatus {
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt: nextResetAt(now) }
}

export function isLow(status: CreditStatus): boolean {
  return status.remaining <= Math.floor(status.limit * LOW_CREDIT_SHARE)
}

// "Dec 1"
export function formatResetDay(resetsAt: number): string {
  return new Date(resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function outOfCreditsMessage(status: CreditStatus, cost: number): string {
  const day = formatResetDay(status.resetsAt)
  if (status.remaining > 0) {
    return `This needs ${cost} AI credits and you have ${status.remaining} left this month. They refill on ${day}.`
  }
  return `You've used this month's ${status.limit} AI credits. They refill on ${day}. Everything else still works.`
}
