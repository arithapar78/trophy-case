import { describe, expect, it } from 'vitest'
import { birthYearOptions, checkAge } from '../../src/lib/ageGate'

// "Now" is fixed at 15 September 2026 so the tests never depend on the day
// they run.
const now = new Date(2026, 8, 15)

describe('T8.1 the age check', () => {
  it('passes someone who turned 13 last month', () => {
    expect(checkAge(2013, 8, now)).toBe('passed')
  })

  it('passes someone whose 13th birthday is this month', () => {
    // Only the month is known, so the whole birth month counts.
    expect(checkAge(2013, 9, now)).toBe('passed')
  })

  it('refuses someone who turns 13 next month', () => {
    expect(checkAge(2013, 10, now)).toBe('under13')
  })

  it('refuses a young child and passes an adult', () => {
    expect(checkAge(2020, 1, now)).toBe('under13')
    expect(checkAge(1980, 5, now)).toBe('passed')
  })

  it('treats a date that cannot be a birth date as not answered', () => {
    expect(checkAge(2026, 10, now)).toBe('invalid') // next month
    expect(checkAge(2030, 1, now)).toBe('invalid') // the future
    expect(checkAge(1900, 1, now)).toBe('invalid') // over 120 years ago
    expect(checkAge(2000, 0, now)).toBe('invalid') // no month 0
    expect(checkAge(2000, 13, now)).toBe('invalid') // no month 13
    expect(checkAge(Number.NaN, 5, now)).toBe('invalid') // nothing picked
  })

  it('offers years starting from this one, so the list does not hint at the answer', () => {
    const years = birthYearOptions(now)
    expect(years[0]).toBe(2026)
    expect(years).toContain(2013)
    expect(years).toContain(1950)
  })
})
