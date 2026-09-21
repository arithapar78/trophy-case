// Ranking and recommendations, server side. Both send text only (the goal
// and the achievements' words), never photos. With no API key they return
// clearly labelled MOCK answers. Nothing is stored.

import {
  MAX_ACHIEVEMENTS_PER_REQUEST,
  type AchievementSummary,
  type GoalRequest,
  type RankItem,
  type RankResponse,
  type RecommendResponse,
  type SuggestionItem,
} from '../src/lib/aiTypes.js'
import { MAX_GOAL_LENGTH } from '../src/lib/types.js'

export const MODEL = 'claude-haiku-4-5'

// Asks the model a text question and returns its text answer. Injected so
// tests can fake it and MOCK mode never touches the network.
export type CallText = (prompt: string) => Promise<string>

export interface AdviceOptions {
  apiKey?: string
  callText?: CallText
}

function isSummary(value: unknown): value is AchievementSummary {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Partial<AchievementSummary>
  return typeof a.id === 'string' && typeof a.title === 'string' && typeof a.category === 'string' && typeof a.date === 'string'
}

export function checkGoalRequest(body: unknown): body is GoalRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Partial<GoalRequest>
  return (
    typeof b.goal === 'string' &&
    b.goal.trim().length > 0 &&
    b.goal.length <= MAX_GOAL_LENGTH &&
    Array.isArray(b.achievements) &&
    b.achievements.length <= MAX_ACHIEVEMENTS_PER_REQUEST &&
    b.achievements.every(isSummary)
  )
}

function describe(a: AchievementSummary): string {
  const extras = [a.organisation && `at ${a.organisation}`, a.role && `role: ${a.role}`, a.result && `result: ${a.result}`, a.note]
    .filter(Boolean)
    .join('; ')
  return `- id ${a.id}: "${a.title}" (${a.category}, ${a.date})${extras ? ` ${extras}` : ''}`
}

// ---- Ranking ----

function rankPrompt(req: GoalRequest): string {
  return `A student's goal: "${req.goal}"

Their achievements:
${req.achievements.map(describe).join('\n')}

Rank every achievement by how much it helps this goal (1 = helps most). Give each a one-sentence reason a student would find useful and honest.
Reply with JSON only, no other text: {"ranks": [{"id": string, "rank": number, "reason": string}, ...]}
Include every id exactly once. Do not invent achievements.`
}

export function mockRanks(achievements: AchievementSummary[]): RankItem[] {
  return achievements.map((a, i) => ({
    id: a.id,
    rank: i + 1,
    reason: `MOCK: sample reason for "${a.title}". Add an API key for real ranking.`,
  }))
}

// Keeps only ids that were sent, fills in any the model forgot, and
// renumbers 1..n so the list is always complete and in order.
export function parseRanks(text: string, achievements: AchievementSummary[]): RankItem[] {
  let raw: { ranks?: unknown } = {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      raw = JSON.parse(text.slice(start, end + 1)) as { ranks?: unknown }
    } catch {
      raw = {}
    }
  }
  const known = new Map(achievements.map((a) => [a.id, a]))
  const seen = new Set<string>()
  const items: RankItem[] = []
  if (Array.isArray(raw.ranks)) {
    for (const entry of raw.ranks as Partial<RankItem>[]) {
      if (!entry || typeof entry.id !== 'string' || !known.has(entry.id) || seen.has(entry.id)) continue
      seen.add(entry.id)
      items.push({
        id: entry.id,
        rank: typeof entry.rank === 'number' ? entry.rank : Number.MAX_SAFE_INTEGER,
        reason: typeof entry.reason === 'string' ? entry.reason.trim().slice(0, 300) : '',
      })
    }
  }
  items.sort((a, b) => a.rank - b.rank)
  for (const a of achievements) {
    if (!seen.has(a.id)) items.push({ id: a.id, rank: Number.MAX_SAFE_INTEGER, reason: 'The AI did not rank this one. Try ranking again.' })
  }
  return items.map((item, i) => ({ ...item, rank: i + 1 }))
}

export async function rankAchievements(body: unknown, options: AdviceOptions = {}): Promise<RankResponse> {
  if (!checkGoalRequest(body)) return { ok: false, message: 'Set a goal and add some achievements first.' }
  if (body.achievements.length === 0) return { ok: false, message: 'There is nothing to rank yet. Add an achievement first.' }
  if (!options.apiKey) return { ok: true, ranks: mockRanks(body.achievements), mock: true }

  const callText = options.callText ?? (await realCallText(options.apiKey))
  try {
    const answer = await callText(rankPrompt(body))
    return { ok: true, ranks: parseRanks(answer, body.achievements), mock: false }
  } catch {
    return { ok: false, message: "The AI couldn't rank right now. Try again in a minute." }
  }
}

// ---- Recommendations ----

function recommendPrompt(req: GoalRequest): string {
  const list = req.achievements.length ? req.achievements.map(describe).join('\n') : '(none yet)'
  return `A student's goal: "${req.goal}"

What they have done so far:
${list}

Suggest exactly 3 concrete next achievements that would help this goal most, given what they already have. Each should be realistic for a student and specific (a competition, a role, a project, a course), not vague advice.
Reply with JSON only, no other text: {"suggestions": [{"title": string, "why": string}, {"title": string, "why": string}, {"title": string, "why": string}]}
"why" is one sentence.`
}

export function mockSuggestions(): SuggestionItem[] {
  return [
    { title: 'MOCK: Enter a regional competition in your strongest category', why: 'MOCK: sample suggestion. Add an API key for real ones.' },
    { title: 'MOCK: Take a leadership role in a club you already belong to', why: 'MOCK: sample suggestion.' },
    { title: 'MOCK: Finish a project you can show, and write it up', why: 'MOCK: sample suggestion.' },
  ]
}

// Always returns exactly three, padding with a plain fallback if needed.
export function parseSuggestions(text: string): SuggestionItem[] {
  let raw: { suggestions?: unknown } = {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      raw = JSON.parse(text.slice(start, end + 1)) as { suggestions?: unknown }
    } catch {
      raw = {}
    }
  }
  const items: SuggestionItem[] = []
  if (Array.isArray(raw.suggestions)) {
    for (const entry of raw.suggestions as Partial<SuggestionItem>[]) {
      if (!entry || typeof entry.title !== 'string' || !entry.title.trim()) continue
      items.push({ title: entry.title.trim().slice(0, 160), why: typeof entry.why === 'string' ? entry.why.trim().slice(0, 300) : '' })
      if (items.length === 3) break
    }
  }
  while (items.length < 3) {
    items.push({ title: 'Ask again for another idea', why: 'The AI gave fewer than three ideas this time.' })
  }
  return items
}

export async function recommendNext(body: unknown, options: AdviceOptions = {}): Promise<RecommendResponse> {
  if (!checkGoalRequest(body)) return { ok: false, message: 'Set a goal first.' }
  if (!options.apiKey) return { ok: true, suggestions: mockSuggestions(), mock: true }

  const callText = options.callText ?? (await realCallText(options.apiKey))
  try {
    const answer = await callText(recommendPrompt(body))
    return { ok: true, suggestions: parseSuggestions(answer), mock: false }
  } catch {
    return { ok: false, message: "The AI couldn't suggest anything right now. Try again in a minute." }
  }
}

// Loaded only when there is a real key, so MOCK mode never imports the SDK.
async function realCallText(apiKey: string): Promise<CallText> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })
  return async (prompt) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  }
}
