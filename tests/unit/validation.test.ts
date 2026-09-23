import { describe, expect, it } from 'vitest'
import { validateAchievement } from '../../src/lib/validation'

const today = '2026-09-21'
const good = { title: 'Won the regional debate', date: '2026-09-20', category: 'Clubs & Leadership' }

describe('validateAchievement', () => {
  it('accepts valid data and trims text', () => {
    const r = validateAchievement({ ...good, title: '  Won  ', note: ' nice ' }, 0, today)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Won')
      expect(r.value.note).toBe('nice')
      expect(r.value.organisation).toBe('')
    }
  })

  it('rejects an empty title', () => {
    const r = validateAchievement({ ...good, title: '   ' }, 0, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.title).toMatch(/title/i)
  })

  it('rejects a title over 120 characters', () => {
    const r = validateAchievement({ ...good, title: 'x'.repeat(121) }, 0, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.title).toBeDefined()
  })

  it('rejects a future date and a nonsense date', () => {
    expect(validateAchievement({ ...good, date: '2026-09-22' }, 0, today).ok).toBe(false)
    expect(validateAchievement({ ...good, date: '2026-02-30' }, 0, today).ok).toBe(false)
    expect(validateAchievement({ ...good, date: 'yesterday' }, 0, today).ok).toBe(false)
  })

  it('allows today', () => {
    expect(validateAchievement({ ...good, date: today }, 0, today).ok).toBe(true)
  })

  it('rejects a note over 500 characters', () => {
    const r = validateAchievement({ ...good, note: 'n'.repeat(501) }, 0, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.note).toBeDefined()
  })

  it('rejects optional fields over 80 characters', () => {
    for (const field of ['organisation', 'role', 'result'] as const) {
      const r = validateAchievement({ ...good, [field]: 'x'.repeat(81) }, 0, today)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errors[field]).toBeDefined()
    }
  })

  it('rejects a bad category', () => {
    const r = validateAchievement({ ...good, category: 'Gaming' }, 0, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.category).toBeDefined()
  })

  it('rejects more than 5 photos', () => {
    expect(validateAchievement(good, 5, today).ok).toBe(true)
    const r = validateAchievement(good, 6, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.photos).toBeDefined()
  })
})
