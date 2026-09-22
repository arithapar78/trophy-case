import { describe, expect, it } from 'vitest'
import { WINDOW_MS, formatWait, windowStatus } from '../../src/lib/aiUsage'

const HOUR = 60 * 60 * 1000

describe('AI usage window', () => {
  it('counts uses in the last 5 hours against the limit', () => {
    const now = 1_000_000_000_000
    const times = Array.from({ length: 10 }, (_, i) => now - i * 1000)
    const status = windowStatus(times, 10, now)
    expect(status).toMatchObject({ used: 10, limit: 10, remaining: 0 })
    expect(status.nextFreeAt).toBe(now - 9000 + WINDOW_MS)
    expect(windowStatus(times, 100, now)).toMatchObject({ used: 10, remaining: 90, nextFreeAt: undefined })
  })

  it('frees a slot exactly 5 hours after the first use', () => {
    const start = 1_000_000_000_000
    const times = Array.from({ length: 10 }, (_, i) => start + i * 1000)
    expect(windowStatus(times, 10, start + WINDOW_MS - 1).remaining).toBe(0)
    expect(windowStatus(times, 10, start + WINDOW_MS).remaining).toBe(1)
  })

  it('ignores old and future entries', () => {
    const now = 1_000_000_000_000
    expect(windowStatus([now - 6 * HOUR, now - HOUR, now + HOUR], 10, now).used).toBe(1)
  })

  it('says how long until the next use in plain words', () => {
    expect(formatWait(30_000, 0)).toBe('1 minute')
    expect(formatWait(45 * 60_000, 0)).toBe('45 minutes')
    expect(formatWait(2 * HOUR, 0)).toBe('2 hours')
    expect(formatWait(2 * HOUR + 5 * 60_000, 0)).toBe('2 h 5 min')
  })
})
