import { describe, expect, it } from 'vitest'
import { FREE_USES_PER_WINDOW, WINDOW_MS, formatWait, getUsage, recordUse, type UsageStore } from '../../src/lib/aiUsage'

function memoryStore(initial: number[] = []): UsageStore {
  let times = initial
  return { read: () => times, write: (t) => { times = t } }
}

const HOUR = 60 * 60 * 1000

describe('AI usage limit', () => {
  it('allows 10 uses in a 5-hour window and refuses the 11th', () => {
    const store = memoryStore()
    const start = 1_000_000_000_000
    for (let i = 0; i < FREE_USES_PER_WINDOW; i++) {
      expect(recordUse(store, start + i * 1000)).toBe(true)
    }
    expect(getUsage(store, start + 20_000).remaining).toBe(0)
    expect(recordUse(store, start + 20_000)).toBe(false)
    expect(store.read()).toHaveLength(FREE_USES_PER_WINDOW)
  })

  it('frees a slot exactly 5 hours after the first use', () => {
    const store = memoryStore()
    const start = 1_000_000_000_000
    for (let i = 0; i < FREE_USES_PER_WINDOW; i++) recordUse(store, start + i * 1000)

    const justBefore = getUsage(store, start + WINDOW_MS - 1)
    expect(justBefore.remaining).toBe(0)
    expect(justBefore.nextFreeAt).toBe(start + WINDOW_MS)

    const exactly = getUsage(store, start + WINDOW_MS)
    expect(exactly.remaining).toBe(1)
    expect(exactly.nextFreeAt).toBeUndefined()
    expect(recordUse(store, start + WINDOW_MS)).toBe(true)
  })

  it('ignores old and broken entries', () => {
    const now = 1_000_000_000_000
    const store = memoryStore([now - 6 * HOUR, now - HOUR, now + HOUR])
    expect(getUsage(store, now).used).toBe(1)
  })

  it('says how long until the next use in plain words', () => {
    const now = 0
    expect(formatWait(now + 30_000, now)).toBe('1 minute')
    expect(formatWait(now + 45 * 60_000, now)).toBe('45 minutes')
    expect(formatWait(now + 2 * HOUR, now)).toBe('2 hours')
    expect(formatWait(now + 2 * HOUR + 5 * 60_000, now)).toBe('2 h 5 min')
  })
})
