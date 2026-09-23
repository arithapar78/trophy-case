// The Me tab's summary, server side: a short, honest read on who the student
// is, written only from their achievements (and their goal, if they have
// one). Text only, never photos. MOCK with no key. Stores nothing.

import {
  MAX_ACHIEVEMENTS_PER_REQUEST,
  MAX_STRENGTHS,
  type AchievementSummary,
  type ProfileSummary,
  type Strength,
  type SummaryRequest,
  type SummaryResponse,
} from '../src/lib/aiTypes.js'
import { MAX_GOAL_LENGTH } from '../src/lib/types.js'
import { realCallText, salvageObjects, type CallText } from './goalAdvice.js'

export interface SummaryOptions {
  apiKey?: string
  callText?: CallText
}

function isSummaryItem(value: unknown): value is AchievementSummary {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Partial<AchievementSummary>
  return typeof a.id === 'string' && typeof a.title === 'string' && typeof a.category === 'string' && typeof a.date === 'string'
}

export function checkSummaryRequest(body: unknown): body is SummaryRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Partial<SummaryRequest>
  return (
    typeof b.goal === 'string' &&
    b.goal.length <= MAX_GOAL_LENGTH &&
    Array.isArray(b.achievements) &&
    b.achievements.length <= MAX_ACHIEVEMENTS_PER_REQUEST &&
    b.achievements.every(isSummaryItem)
  )
}

function describe(a: AchievementSummary): string {
  const extras = [a.organisation && `at ${a.organisation}`, a.role && `role: ${a.role}`, a.result && `result: ${a.result}`, a.note]
    .filter(Boolean)
    .join('; ')
  return `"${a.title}" (${a.category}, ${a.date})${extras ? ` ${extras}` : ''}`
}

// Numbered, like ranking, so the model points at achievements with a short
// number instead of copying back a long id (see the ranking fix).
export function summaryPrompt(req: SummaryRequest): string {
  const numbered = req.achievements.map((a, i) => `${i + 1}. ${describe(a)}`).join('\n')
  const goalLine = req.goal.trim() ? `Their goal: "${req.goal.trim()}"` : 'They have not set a goal.'
  return `A student (13 to 18) keeps a record of their achievements. Write a short, honest read on who they are, based only on this record.

${goalLine}

Their achievements, numbered:
${numbered}

Reply with JSON only, no other text, in exactly this shape:
{"summary": string, "strengths": [{"name": string, "why": string, "examples": [number, ...]}, ...]}

Rules:
- summary: 2 to 4 sentences, speaking to them as "you" ("You're someone who..."). Specific to THIS record, naming what stands out. Warm but not flattering. No exclamation marks, no corporate phrasing.
- strengths: 3 to 5 if the record supports that many, fewer if it is thin. Each "name" is 2 to 5 words. "why" is one sentence. "examples" are the numbers of the achievements that show it.
- If a goal is set, you may say in one sentence how the record lines up with it.
- Use only what is in the list. Never invent achievements, schools, awards, grades or traits the record does not show.`
}

export function mockSummary(achievements: AchievementSummary[]): ProfileSummary {
  const first = achievements[0]
  return {
    text: `MOCK: this is a sample summary, because no API key is set on this server. You have ${achievements.length} achievement${achievements.length === 1 ? '' : 's'} saved${first ? `, and "${first.title}" is one of them` : ''}.`,
    strengths: [
      { name: 'MOCK: Shows up', why: 'MOCK: a sample strength.', achievementIds: first ? [first.id] : [] },
      { name: 'MOCK: Keeps a record', why: 'MOCK: another sample strength.', achievementIds: [] },
      { name: 'MOCK: Ready for more', why: 'MOCK: a third sample strength.', achievementIds: [] },
    ],
  }
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Turns the model's answer into a summary, or undefined if it is not usable.
// A strength's example numbers are mapped back to the ids that were sent;
// a number that is not on the list is dropped, never guessed at.
export function parseSummary(text: string, achievements: AchievementSummary[]): ProfileSummary | undefined {
  const objects = salvageObjects(text)
  const top = objects.find((o) => typeof o.summary === 'string')
  if (!top) return undefined
  const summaryText = clean(top.summary, 800)
  if (!summaryText) return undefined

  const strengths: Strength[] = []
  const rawStrengths = Array.isArray(top.strengths) ? top.strengths : []
  for (const entry of rawStrengths) {
    if (typeof entry !== 'object' || entry === null) continue
    const s = entry as Record<string, unknown>
    const name = clean(s.name, 60)
    if (!name) continue
    const numbers = Array.isArray(s.examples) ? s.examples : []
    const ids = new Set<string>()
    for (const n of numbers) {
      if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= achievements.length) ids.add(achievements[n - 1].id)
    }
    strengths.push({ name, why: clean(s.why, 240), achievementIds: [...ids] })
    if (strengths.length === MAX_STRENGTHS) break
  }
  return { text: summaryText, strengths }
}

export async function writeSummary(body: unknown, options: SummaryOptions = {}): Promise<SummaryResponse> {
  if (!checkSummaryRequest(body)) return { ok: false, message: "Couldn't read your achievements. Try again." }
  if (body.achievements.length === 0) return { ok: false, message: 'Add an achievement first, then ask for a summary.' }
  if (!options.apiKey) return { ok: true, summary: mockSummary(body.achievements), mock: true }

  const callText = options.callText ?? (await realCallText(options.apiKey))
  try {
    const answer = await callText(summaryPrompt(body), 900)
    const summary = parseSummary(answer, body.achievements)
    if (!summary) return { ok: false, message: "The AI's answer came back muddled. Try again." }
    return { ok: true, summary, mock: false }
  } catch {
    return { ok: false, message: "The AI couldn't write your summary right now. Try again in a minute." }
  }
}
