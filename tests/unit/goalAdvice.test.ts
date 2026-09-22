import { describe, expect, it, vi } from 'vitest'
import { checkGoalRequest, mockRanks, mockSuggestions, parseRanks, parseSuggestions, rankAchievements, rankPrompt, recommendNext } from '../../server/goalAdvice'
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

describe('ranking survives what a real model actually sends back', () => {
  const achievements = [
    { id: '0f8b2c1a-7d3e-4a9f-b6c5-1e2d3f4a5b6c', title: 'Science fair', category: 'School', date: '2026-03-04', note: '', organisation: '', role: '', result: '' },
    { id: '9a7e4d2b-5c1f-4e8a-9d3b-2f6c8a1e4d7b', title: 'Debate final', category: 'Debate', date: '2026-05-01', note: '', organisation: '', role: '', result: '' },
  ]

  function unranked(ranks: { reason: string }[]) {
    return ranks.filter((r) => r.reason.startsWith('The AI did not rank'))
  }

  // This is the bug Vishal hit on his phone: every achievement came back as
  // "the AI did not rank this one" while recommendations worked fine.
  // Ranking used to ask the model to copy back 36-character random ids, and
  // one wrong character dropped that achievement. It answers with short
  // numbers now.
  it('ranks by the numbers in the prompt', () => {
    const answer = JSON.stringify({
      ranks: [
        { n: 2, rank: 1, reason: 'Shows communication.' },
        { n: 1, rank: 2, reason: 'Strongest for engineering.' },
      ],
    })
    const ranks = parseRanks(answer, achievements)
    expect(unranked(ranks)).toHaveLength(0)
    expect(ranks[0]).toMatchObject({ id: achievements[1].id, rank: 1 })
    expect(ranks[1]).toMatchObject({ id: achievements[0].id, rank: 2 })
  })

  it('still accepts a correct id, in case a model answers with one', () => {
    const answer = JSON.stringify({
      ranks: [{ id: achievements[0].id, rank: 1, reason: 'Fine.' }, { n: 2, rank: 2, reason: 'Also fine.' }],
    })
    expect(unranked(parseRanks(answer, achievements))).toHaveLength(0)
  })

  it('keeps what arrived when the answer is cut off part-way', () => {
    // A truncated answer: the array and the outer object never close. This
    // used to throw the whole thing away and lose every achievement.
    const answer = '{"ranks": [{"n": 1, "rank": 1, "reason": "Strongest for engineering."}, {"n": 2, "rank": 2, "reas'
    const ranks = parseRanks(answer, achievements)
    expect(unranked(ranks)).toHaveLength(1)
    expect(ranks[0]).toMatchObject({ id: achievements[0].id })
    expect(ranks[0].reason).toBe('Strongest for engineering.')
  })

  it('ignores a number that is not on the list, and a repeat', () => {
    const answer = JSON.stringify({
      ranks: [
        { n: 1, rank: 1, reason: 'First.' },
        { n: 99, rank: 2, reason: 'Invented.' },
        { n: 1, rank: 3, reason: 'Said twice.' },
      ],
    })
    const ranks = parseRanks(answer, achievements)
    expect(ranks).toHaveLength(2)
    expect(ranks[0].reason).toBe('First.')
    expect(unranked(ranks)).toHaveLength(1)
  })

  it('copes with a model that wraps its answer in chat or a code fence', () => {
    const answer = 'Sure, here you go:\n```json\n{"ranks":[{"n":1,"rank":1,"reason":"A."},{"n":2,"rank":2,"reason":"B."}]}\n```\nHope that helps.'
    expect(unranked(parseRanks(answer, achievements))).toHaveLength(0)
  })

  it('asks for numbers, not ids, and never puts an id in the prompt', () => {
    const prompt = rankPrompt({ goal: 'engineering school', achievements })
    expect(prompt).toContain('1. "Science fair"')
    expect(prompt).toContain('2. "Debate final"')
    expect(prompt).not.toContain(achievements[0].id)
    expect(prompt).toMatch(/every number from 1 to 2/)
  })

  it('gives a long timeline more room to answer in', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...achievements[0], id: `id-${i}`, title: `Win ${i}` }))
    let asked = 0
    await rankAchievements(
      { goal: 'x', achievements: many },
      {
        apiKey: 'sk-test',
        callText: async (_prompt, maxTokens) => {
          asked = maxTokens ?? 0
          return JSON.stringify({ ranks: many.map((_, i) => ({ n: i + 1, rank: i + 1, reason: 'ok' })) })
        },
      },
    )
    expect(asked).toBeGreaterThan(1500)
  })
})
