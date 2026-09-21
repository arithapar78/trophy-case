// The AI limit: 10 uses per rolling 5 hours, counted on this device. The
// timestamps of recent uses are kept in localStorage. A use "frees up"
// exactly 5 hours after it happened.

export const FREE_USES_PER_WINDOW = 10
export const WINDOW_MS = 5 * 60 * 60 * 1000
const KEY = 'trophy-case.ai-uses'

export interface UsageStore {
  read(): number[]
  write(times: number[]): void
}

export const localUsageStore: UsageStore = {
  read() {
    try {
      const raw = localStorage.getItem(KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter((t): t is number => typeof t === 'number') : []
    } catch {
      return []
    }
  },
  write(times) {
    try {
      localStorage.setItem(KEY, JSON.stringify(times))
    } catch {
      // Storage unavailable: the limit just isn't remembered. Fine.
    }
  },
}

export interface UsageStatus {
  used: number
  remaining: number
  // When the next use frees up, if at the limit. Otherwise undefined.
  nextFreeAt?: number
}

function recent(times: number[], now: number): number[] {
  return times.filter((t) => t > now - WINDOW_MS && t <= now).sort((a, b) => a - b)
}

export function getUsage(store: UsageStore = localUsageStore, now: number = Date.now()): UsageStatus {
  const times = recent(store.read(), now)
  const used = times.length
  const remaining = Math.max(0, FREE_USES_PER_WINDOW - used)
  return {
    used,
    remaining,
    nextFreeAt: remaining === 0 ? times[0] + WINDOW_MS : undefined,
  }
}

// Records one use. Returns false (and records nothing) if at the limit.
export function recordUse(store: UsageStore = localUsageStore, now: number = Date.now()): boolean {
  const times = recent(store.read(), now)
  if (times.length >= FREE_USES_PER_WINDOW) return false
  store.write([...times, now])
  return true
}

export function formatWait(nextFreeAt: number, now: number = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((nextFreeAt - now) / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} hour${hours === 1 ? '' : 's'}`
}
