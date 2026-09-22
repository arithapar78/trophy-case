// The AI ceiling window: N uses per rolling 5 hours. A use "frees up"
// exactly 5 hours after it happened. The counting happens on the server (see
// server/usage.ts) and is deliberately invisible in the app.

// Kept so the server and the app agree on the number, but the app does not
// show it any more: there is no counter in the UI. See server/usage.ts for
// why a ceiling still exists at all.
export const FREE_USES_PER_WINDOW = 300
export const PRO_USES_PER_WINDOW = 300
export const WINDOW_MS = 5 * 60 * 60 * 1000

export interface UsageStatus {
  used: number
  limit: number
  remaining: number
  // When the next use frees up, if at the limit. Otherwise undefined.
  nextFreeAt?: number
}

export function windowStatus(times: number[], limit: number, now: number = Date.now()): UsageStatus {
  const recent = times.filter((t) => t > now - WINDOW_MS && t <= now).sort((a, b) => a - b)
  const used = recent.length
  const remaining = Math.max(0, limit - used)
  return {
    used,
    limit,
    remaining,
    nextFreeAt: remaining === 0 && recent.length ? recent[0] + WINDOW_MS : undefined,
  }
}

export function formatWait(nextFreeAt: number, now: number = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((nextFreeAt - now) / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} hour${hours === 1 ? '' : 's'}`
}
