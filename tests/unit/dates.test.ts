import { describe, expect, it } from 'vitest'
import { formatDate, isFutureDate, isValidISODate, todayISO } from '../../src/lib/dates'

describe('dates', () => {
  it('formats today in local time, not UTC', () => {
    // 11:30pm local on Sep 21: UTC might already be Sep 22, but the user
    // sees Sep 21 on their phone, so that is the answer.
    expect(todayISO(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21')
  })

  it('checks real dates', () => {
    expect(isValidISODate('2026-09-21')).toBe(true)
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('21/09/2026')).toBe(false)
  })

  it('compares dates as text', () => {
    expect(isFutureDate('2026-09-22', '2026-09-21')).toBe(true)
    expect(isFutureDate('2026-09-21', '2026-09-21')).toBe(false)
  })

  it('formats for display', () => {
    expect(formatDate('2026-09-21')).toMatch(/Sep(t)?\.? 21, 2026/)
  })
})
