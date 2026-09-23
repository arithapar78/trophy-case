// Phase 10 tests: the Me tab's summary (server), and the grouping, totals,
// "changed since" and card layout maths (phone).

import { beforeEach, describe, expect, it } from 'vitest'
import { checkSummaryRequest, mockSummary, parseSummary, summaryPrompt, writeSummary } from '../../server/summary'
import type { AchievementSummary } from '../../src/lib/aiTypes'
import { deleteEverything } from '../../src/lib/backup'
import {
  categoryBars,
  changesSince,
  describeChanges,
  getSavedSummary,
  groupByCategory,
  hasChanges,
  profileTotals,
  saveSummary,
  yearSpan,
  type SavedSummary,
} from '../../src/lib/profile'
import { profileCardFileName, wrapLines } from '../../src/lib/profileCard'
import type { Achievement } from '../../src/lib/types'

function achievement(id: string, over: Partial<Achievement> = {}): Achievement {
  return {
    id,
    title: `Win ${id}`,
    date: '2026-03-01',
    category: 'School',
    note: '',
    organisation: '',
    role: '',
    result: '',
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }
}

const sent: AchievementSummary[] = [
  { id: 'id-a', title: 'Science fair, 1st place', category: 'School', date: '2026-04-01', note: '', organisation: 'Arlington High', role: '', result: '1st' },
  { id: 'id-b', title: 'Varsity swim', category: 'Sports', date: '2025-11-01', note: '', organisation: '', role: 'captain', result: '' },
]

describe('T10.1 the summary, server side', () => {
  it('the prompt holds the achievements\' words and the goal, numbered, and nothing else', () => {
    const prompt = summaryPrompt({ goal: 'study engineering', achievements: sent })
    expect(prompt).toContain('study engineering')
    expect(prompt).toContain('1. "Science fair, 1st place" (School, 2026-04-01) at Arlington High; result: 1st')
    expect(prompt).toContain('2. "Varsity swim"')
    expect(prompt).not.toContain('id-a')
    expect(prompt).toContain('Never invent')
  })

  it('says when there is no goal', () => {
    expect(summaryPrompt({ goal: '', achievements: sent })).toContain('have not set a goal')
  })

  it('a photo sent by mistake never reaches the prompt', () => {
    const withPhoto = { goal: '', achievements: [{ ...sent[0], photo: 'data:image/jpeg;base64,AAAA' }] }
    expect(checkSummaryRequest(withPhoto)).toBe(true)
    expect(summaryPrompt(withPhoto)).not.toContain('base64')
  })

  it('reads a good answer and maps example numbers back to the ids that were sent', () => {
    const answer = 'Here you go: {"summary":"You finish what you start.","strengths":[{"name":"Builds things","why":"The fair.","examples":[1]},{"name":"Leads","why":"Captain.","examples":[2, 9, "x"]}]}'
    expect(parseSummary(answer, sent)).toEqual({
      text: 'You finish what you start.',
      strengths: [
        { name: 'Builds things', why: 'The fair.', achievementIds: ['id-a'] },
        { name: 'Leads', why: 'Captain.', achievementIds: ['id-b'] },
      ],
    })
  })

  it('keeps at most five strengths and skips nameless ones', () => {
    const strengths = Array.from({ length: 8 }, (_, i) => ({ name: i === 0 ? '' : `S${i}`, why: '', examples: [] }))
    const parsed = parseSummary(JSON.stringify({ summary: 'You.', strengths }), sent)
    expect(parsed?.strengths.map((s) => s.name)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
  })

  it('refuses a malformed answer rather than showing it', () => {
    expect(parseSummary('I cannot do that.', sent)).toBeUndefined()
    expect(parseSummary('{"summary":""}', sent)).toBeUndefined()
    expect(parseSummary('{"summary": 5}', sent)).toBeUndefined()
  })

  it('MOCK mode answers without a key and is clearly labelled', async () => {
    const result = await writeSummary({ goal: '', achievements: sent })
    expect(result.ok && result.mock).toBe(true)
    expect(result.ok && result.summary.text).toMatch(/^MOCK/)
    expect(mockSummary(sent).strengths).toHaveLength(3)
  })

  it('refuses an empty timeline and a bad request, and handles a failed call', async () => {
    expect((await writeSummary({ goal: '', achievements: [] })).ok).toBe(false)
    expect((await writeSummary({ goal: 5 })).ok).toBe(false)
    const failed = await writeSummary({ goal: '', achievements: sent }, { apiKey: 'k', callText: async () => { throw new Error('down') } })
    expect(failed).toEqual({ ok: false, message: "The AI couldn't write your summary right now. Try again in a minute." })
    const muddled = await writeSummary({ goal: '', achievements: sent }, { apiKey: 'k', callText: async () => 'no json here' })
    expect(muddled.ok).toBe(false)
  })

  it('passes a real answer through when there is a key', async () => {
    const result = await writeSummary(
      { goal: '', achievements: sent },
      { apiKey: 'k', callText: async () => '{"summary":"You build and you lead.","strengths":[]}' },
    )
    expect(result).toEqual({ ok: true, summary: { text: 'You build and you lead.', strengths: [] }, mock: false })
  })
})

describe('T10.2 grouping, totals and "changed since"', () => {
  const rows = [
    achievement('1', { category: 'Sports', date: '2024-05-01' }),
    achievement('2', { category: 'Debate', date: '2026-02-01' }),
    achievement('3', { category: 'Sports', date: '2026-01-01' }),
    achievement('4', { category: 'Mystery', date: '2025-01-01' }),
  ].map((a) => ({ achievement: a }))

  it('groups in the user\'s category order, newest first, empty ones left out, unknown ones last', () => {
    const groups = groupByCategory(rows, ['School', 'Sports', 'Debate', 'Other'])
    expect(groups.map((g) => g.category)).toEqual(['Sports', 'Debate', 'Mystery'])
    expect(groups[0].items.map((r) => r.achievement.id)).toEqual(['3', '1'])
  })

  it('counts totals and the span of years', () => {
    const totals = profileTotals(rows.map((r) => r.achievement))
    expect(totals).toEqual({ achievements: 4, categories: 3, firstYear: 2024, lastYear: 2026 })
    expect(yearSpan(totals)).toBe('2024 to 2026')
    expect(yearSpan(profileTotals([achievement('x')]))).toBe('2026')
  })

  it('handles an empty timeline', () => {
    expect(profileTotals([])).toEqual({ achievements: 0, categories: 0 })
    expect(yearSpan(profileTotals([]))).toBe('')
    expect(groupByCategory([], ['School'])).toEqual([])
    expect(categoryBars([])).toEqual([])
  })

  it('draws the biggest categories and folds the rest into one bar', () => {
    const many = ['A', 'A', 'A', 'B', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) => achievement(String(i), { category: c }))
    const bars = categoryBars(many, 4)
    expect(bars.map((b) => [b.category, b.count])).toEqual([['A', 3], ['B', 2], ['C', 1], ['4 more', 4]])
    expect(bars[0].fraction).toBe(0.75)
    expect(bars[3].fraction).toBe(1)
  })

  const saved: SavedSummary = {
    text: 'You.',
    strengths: [],
    writtenAt: 100,
    goal: 'engineering',
    achievementIds: ['1', '2', 'gone'],
    mock: false,
  }

  it('says what was added, changed and removed since the summary', () => {
    const now = [achievement('1'), achievement('2', { updatedAt: 200 }), achievement('new')]
    const changes = changesSince(saved, now, 'engineering')
    expect(changes).toEqual({ added: 1, changed: 1, removed: 1, goalChanged: false })
    expect(hasChanges(changes)).toBe(true)
    expect(describeChanges(changes)).toBe('1 added, 1 changed and 1 removed since.')
  })

  it('notices a changed goal, and says nothing when nothing changed', () => {
    const same = [achievement('1'), achievement('2'), achievement('gone')]
    expect(hasChanges(changesSince(saved, same, 'engineering'))).toBe(false)
    expect(describeChanges(changesSince(saved, same, 'engineering'))).toBe('')
    expect(describeChanges(changesSince(saved, same, 'medicine'))).toBe('Your goal changed.')
    expect(describeChanges(changesSince(saved, [...same, achievement('n')], 'medicine'))).toBe('1 added since, and your goal changed.')
  })
})

describe('the saved summary lives on the device', () => {
  beforeEach(async () => {
    await deleteEverything()
  })

  it('round-trips, and a broken row reads as no summary', async () => {
    expect(await getSavedSummary()).toBeUndefined()
    const saved: SavedSummary = { text: 'You.', strengths: [{ name: 'Leads', why: '', achievementIds: [] }], writtenAt: 1, goal: '', achievementIds: [], mock: true }
    await saveSummary(saved)
    expect(await getSavedSummary()).toEqual(saved)
  })
})

describe('the picture layout', () => {
  // One character = 10 units wide, so the maths is easy to check.
  const measure = (s: string) => s.length * 10

  it('wraps words into lines that fit', () => {
    expect(wrapLines('one two three four', 100, measure, 5)).toEqual(['one two', 'three four'])
  })

  it('ends the last line with … when there is too much', () => {
    const lines = wrapLines('aaa bbb ccc ddd eee fff', 70, measure, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(measure(lines[1])).toBeLessThanOrEqual(70)
  })

  it('names the file by date', () => {
    expect(profileCardFileName(new Date(Date.UTC(2026, 8, 23, 12)))).toBe('trophy-case-profile-2026-09-23.png')
  })
})
