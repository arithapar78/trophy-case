import { describe, expect, it, vi } from 'vitest'
import { checkGoalRequest, mockRanks, mockSuggestions, parseRanks, parseSuggestions, rankAchievements, recommendNext } from '../../server/goalAdvice'
import type { AchievementSummary } from '../../src/lib/aiTypes'

const items: AchievementSummary[] = [
  { id: 'a', title: 'Debate final', category: 'Debate', date: '2026-03-01', note: '', organisation: '', role: '', result: '' },
  { id: 'b', title: 'Bake sale', category: 'Cooking', date: '2026-02-01', note: '', organisation: '', role: '', result: '' },
  { id: 'c', title: 'Robotics club', category: 'School', date: '2026-01-01', note: '', organisation: '', role: 'Member', result: '' },
]
const request = { goal: 'Get into a top engineering school', achievements: items }

describe('ranking', () => {
  it('MOCK ranks every achievement passed in, and no others, with a reason each', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await rankAchievements(request)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mock).toBe(true)
      expect(result.ranks.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
      expect(result.ranks.map((r) => r.rank)).toEqual([1, 2, 3])
      for (const r of result.ranks) expect(r.reason.length).toBeGreaterThan(0)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    expect(mockRanks(items)).toHaveLength(3)
  })

  it('refuses a missing goal or nothing to rank', async () => {
    expect((await rankAchievements({ goal: '', achievements: items })).ok).toBe(false)
    const empty = await rankAchievements({ goal: 'x', achievements: [] })
    expect(empty).toEqual({ ok: false, message: 'There is nothing to rank yet. Add an achievement first.' })
    expect(checkGoalRequest({ goal: 'x'.repeat(201), achievements: [] })).toBe(false)
  })

  it('uses the model answer, drops invented ids, fills in forgotten ones', async () => {
    const callText = vi.fn(async () => '{"ranks":[{"id":"c","rank":1,"reason":"Robotics is engineering."},{"id":"zzz","rank":2,"reason":"made up"},{"id":"a","rank":3,"reason":"Debate shows reasoning."}]}')
    const result = await rankAchievements(request, { apiKey: 'test', callText })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mock).toBe(false)
      expect(result.ranks.map((r) => r.id)).toEqual(['c', 'a', 'b'])
      expect(result.ranks.map((r) => r.rank)).toEqual([1, 2, 3])
      expect(result.ranks[2].reason).toMatch(/did not rank/)
    }
  })

  it('survives a nonsense answer', () => {
    const ranks = parseRanks('I cannot do that', items)
    expect(ranks.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('reports a model failure in plain words', async () => {
    const result = await rankAchievements(request, { apiKey: 'test', callText: async () => { throw new Error('boom') } })
    expect(result.ok).toBe(false)
  })
})

describe('recommendations', () => {
  it('MOCK returns exactly three with a reason each', async () => {
    const result = await recommendNext(request)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mock).toBe(true)
      expect(result.suggestions).toHaveLength(3)
      for (const s of result.suggestions) expect(s.why.length).toBeGreaterThan(0)
    }
    expect(mockSuggestions()).toHaveLength(3)
  })

  it('works with a goal but no achievements yet', async () => {
    expect((await recommendNext({ goal: 'x', achievements: [] })).ok).toBe(true)
  })

  it('always returns three, even if the model gives two or five', () => {
    expect(parseSuggestions('{"suggestions":[{"title":"A","why":"a"},{"title":"B","why":"b"}]}')).toHaveLength(3)
    expect(parseSuggestions('{"suggestions":[{"title":"A","why":"a"},{"title":"B","why":"b"},{"title":"C","why":"c"},{"title":"D","why":"d"},{"title":"E","why":"e"}]}').map((s) => s.title)).toEqual(['A', 'B', 'C'])
    expect(parseSuggestions('garbage')).toHaveLength(3)
  })
})
