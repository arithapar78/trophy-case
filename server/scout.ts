// Scout, server side. A chat that already knows the student's goal and
// everything on their timeline, so they can ask "what should I do next" in
// their own words instead of tapping buttons.
//
// Same model as the rest of the app (Claude Haiku: cheapest, lightest, and
// plenty for this). Same MOCK mode with no key. Nothing is stored here: the
// conversation lives on the phone and is sent up with each message.

import {
  MAX_ACHIEVEMENTS_PER_REQUEST,
  MAX_ATTACHMENT_BASE64_LENGTH,
  MAX_ATTACHMENT_TEXT_LENGTH,
  MAX_SCOUT_MESSAGE_LENGTH,
  SCOUT_HISTORY_TURNS,
  type AchievementSummary,
  type ProposedAchievement,
  type ScoutAttachment,
  type ScoutRequest,
  type ScoutResponse,
  type ScoutTurn,
} from '../src/lib/aiTypes.js'
import { MAX_GOAL_LENGTH } from '../src/lib/types.js'
import { categoryListFromRequest, categoryOrFallback, fullCategoryList } from '../src/lib/validation.js'

export const MODEL = 'claude-haiku-4-5'
export const SCOUT_NAME = 'Scout'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// One user turn, as the model sees it: some text and possibly one file.
export interface ModelBlock {
  type: 'text' | 'image' | 'document'
  text?: string
  source?: { type: 'base64'; media_type: string; data: string }
}

export interface ModelTurn {
  role: 'user' | 'assistant'
  content: ModelBlock[]
}

// Asks the model and returns its text. Injected so tests can fake it and
// MOCK mode never touches the network.
export type CallChat = (system: string, turns: ModelTurn[]) => Promise<string>

export interface ScoutOptions {
  apiKey?: string
  callChat?: CallChat
}

// --- Checking what arrived ---

function isSummary(value: unknown): value is AchievementSummary {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Partial<AchievementSummary>
  return typeof a.id === 'string' && typeof a.title === 'string' && typeof a.category === 'string' && typeof a.date === 'string'
}

function isTurn(value: unknown): value is ScoutTurn {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Partial<ScoutTurn>
  return (t.role === 'user' || t.role === 'scout') && typeof t.text === 'string'
}

// Returns why an attachment is refused, or undefined when it is fine. The
// app checks the same rules before sending, so a message here means either a
// very old app or someone poking the function directly.
export function attachmentProblem(attachment: ScoutAttachment | undefined): string | undefined {
  if (!attachment) return undefined
  if (typeof attachment.data !== 'string' || !attachment.data) return 'That file came through empty.'
  if (attachment.kind === 'text') {
    if (attachment.data.length > MAX_ATTACHMENT_TEXT_LENGTH) return 'That text file is too long to send. Try a shorter one.'
    return undefined
  }
  if (attachment.kind === 'image') {
    if (!attachment.mediaType || !IMAGE_TYPES.has(attachment.mediaType)) return 'Scout can read JPG, PNG, WEBP and GIF pictures.'
  } else if (attachment.kind !== 'pdf') {
    return 'Scout can read pictures, PDFs and plain text files.'
  }
  if (attachment.data.length > MAX_ATTACHMENT_BASE64_LENGTH) return 'That file is too big to send. About 3 MB is the most Scout can take.'
  return undefined
}

export function checkScoutRequest(body: unknown): body is ScoutRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Partial<ScoutRequest>
  if (typeof b.message !== 'string') return false
  // A message can be empty only when a file is doing the talking.
  if (!b.message.trim() && !b.attachment) return false
  if (b.message.length > MAX_SCOUT_MESSAGE_LENGTH) return false
  if (typeof b.goal !== 'string' || b.goal.length > MAX_GOAL_LENGTH) return false
  if (typeof b.today !== 'string') return false
  if (!Array.isArray(b.achievements) || b.achievements.length > MAX_ACHIEVEMENTS_PER_REQUEST) return false
  if (!b.achievements.every(isSummary)) return false
  if (!Array.isArray(b.history) || !b.history.every(isTurn)) return false
  return true
}

// --- The prompt ---

function describe(a: AchievementSummary): string {
  const extras = [a.organisation && `at ${a.organisation}`, a.role && `role: ${a.role}`, a.result && `result: ${a.result}`, a.note]
    .filter(Boolean)
    .join('; ')
  return `- "${a.title}" (${a.category}, ${a.date})${extras ? ` ${extras}` : ''}`
}

export function buildSystemPrompt(req: ScoutRequest): string {
  const goalLine = req.goal.trim()
    ? `Their goal, in their own words: "${req.goal.trim()}"`
    : 'They have not set a goal yet. Early on, mention once that setting one in Settings makes your advice much sharper. Do not nag about it again.'

  const achievementsBlock = req.achievements.length
    ? `Everything on their timeline (${req.achievements.length}):\n${req.achievements.map(describe).join('\n')}`
    : 'Their timeline is empty. Encourage them to add their first achievement, and offer to help work out what counts.'

  return `You are ${SCOUT_NAME}, the guide inside an app called Trophy Case. The person you are talking to is a student, usually 13 to 18, keeping a record of their achievements so they can use it for college and job applications later.

${goalLine}

Today's date is ${req.today}.

${achievementsBlock}

How to answer:
- Stay on their achievements, their goal, and how to get from one to the other. If they ask about something else, say plainly that is not what you are for and offer something you can help with instead. Do not answer off-topic questions even when pressed.
- Be specific about THEIR record. Name the achievements you mean. Generic advice they could have got anywhere is a wasted answer.
- Keep it short. A few sentences, or a short list. They are reading on a phone.
- Talk like a helpful older student, not a brochure. No corporate phrasing, no flattery, no exclamation marks.
- Be honest. If their record is thin for what they are aiming at, say so kindly and say what would help most.
- You cannot change anything in the app yourself. To add or edit an achievement, tell them what to tap, or offer it as described below.

If the conversation or an attached file contains an achievement that is not already on their timeline, offer to save it. To do that, end your reply with a block exactly like this, after your normal answer:

<save>
{"title": "...", "category": "exactly one of ${categoryListFromRequest(req.categories).join(', ')}", "date": "YYYY-MM-DD", "note": "...", "organisation": "...", "role": "...", "result": "..."}
</save>

Rules for that block: only when there is a real achievement to add, never more than one per reply, never for something already on the timeline, and every field a string (empty is fine except title, category and date). The date can never be in the future. Say in your normal answer that they can save it, because they will see a card with a Save button. Never pretend you have saved anything: only they can.`
}

// The conversation, plus this message and its file, in the shape the model
// takes. Photos of achievements already on the timeline are never included:
// only a file attached to this message travels.
export function buildTurns(req: ScoutRequest): ModelTurn[] {
  const recent = req.history.slice(-SCOUT_HISTORY_TURNS)
  const turns: ModelTurn[] = recent.map((turn) => ({
    role: turn.role === 'user' ? 'user' : 'assistant',
    content: [{ type: 'text', text: turn.text }],
  }))

  const content: ModelBlock[] = []
  const attachment = req.attachment
  if (attachment) {
    if (attachment.kind === 'image' && attachment.mediaType) {
      content.push({ type: 'image', source: { type: 'base64', media_type: attachment.mediaType, data: attachment.data } })
    } else if (attachment.kind === 'pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.data } })
    } else {
      content.push({ type: 'text', text: `They attached a text file called ${attachment.name}:\n\n${attachment.data}` })
    }
  }
  content.push({ type: 'text', text: req.message.trim() || 'Have a look at this file and tell me what you make of it.' })
  turns.push({ role: 'user', content })
  return turns
}

// --- Reading the answer back ---

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export interface ParsedReply {
  reply: string
  proposed?: ProposedAchievement
}

// Splits Scout's answer into the words the student sees and, if there is
// one, the achievement it is offering. A malformed block is dropped rather
// than shown: a broken suggestion is worse than none.
// `categories` is the user's list; a category not on it becomes Other
// rather than sinking the whole offer.
export function parseScoutReply(text: string, today: string, categories: readonly string[] = fullCategoryList([])): ParsedReply {
  const start = text.indexOf('<save>')
  if (start === -1) return { reply: text.trim() }

  const end = text.indexOf('</save>', start)
  const reply = text.slice(0, start).trim()
  if (end === -1) return { reply }

  const inner = text.slice(start + '<save>'.length, end).trim()
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(inner) as Record<string, unknown>
  } catch {
    return { reply }
  }

  const title = cleanString(raw.title, 120)
  const date = cleanString(raw.date, 10)
  if (!title) return { reply }
  // The same rule the form uses: a date must be real and not in the future.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date > today) return { reply }

  return {
    reply,
    proposed: {
      title,
      category: categoryOrFallback(raw.category, categories),
      date,
      note: cleanString(raw.note, 500),
      organisation: cleanString(raw.organisation, 80),
      role: cleanString(raw.role, 80),
      result: cleanString(raw.result, 80),
    },
  }
}

// --- MOCK mode ---

// With a file attached, MOCK mode also offers a sample achievement, so the
// Save / No thanks card can be tried and tested without an API key.
function mockProposed(req: ScoutRequest): ProposedAchievement | undefined {
  if (!req.attachment) return undefined
  return {
    title: `MOCK achievement from ${req.attachment.name}`,
    category: 'Other',
    date: req.today,
    note: 'A sample suggestion, because no API key is set on this server.',
    organisation: '',
    role: '',
    result: '',
  }
}

function mockReply(req: ScoutRequest): string {
  if (req.attachment) {
    return `MOCK Scout: this is a sample answer, because no API key is set on this server. I had a look at ${req.attachment.name} and there is something in it worth saving.`
  }
  if (!req.achievements.length) {
    return 'MOCK Scout: your timeline is empty, so there is nothing for me to work with yet. Add your first achievement and ask me again.'
  }
  const first = req.achievements[0]
  const goalPart = req.goal.trim() ? `towards "${req.goal.trim()}"` : 'once you set a goal in Settings'
  return `MOCK Scout: this is a sample answer, because no API key is set on this server. Looking at your ${req.achievements.length} saved achievement${req.achievements.length === 1 ? '' : 's'}, "${first.title}" is the one I would lead with ${goalPart}.`
}

export async function askScout(body: unknown, options: ScoutOptions = {}): Promise<ScoutResponse> {
  if (!checkScoutRequest(body)) return { ok: false, message: "Scout couldn't read that message. Try again." }

  const problem = attachmentProblem(body.attachment)
  if (problem) return { ok: false, message: problem }

  if (!options.apiKey) return { ok: true, reply: mockReply(body), proposed: mockProposed(body), mock: true }

  const callChat = options.callChat ?? (await realCallChat(options.apiKey))
  try {
    const answer = await callChat(buildSystemPrompt(body), buildTurns(body))
    const parsed = parseScoutReply(answer, body.today, categoryListFromRequest(body.categories))
    if (!parsed.reply) return { ok: false, message: 'Scout went quiet that time. Try asking again.' }
    return { ok: true, reply: parsed.reply, proposed: parsed.proposed, mock: false }
  } catch {
    return { ok: false, message: "Scout couldn't answer just now. Check your signal and try again." }
  }
}

// Loaded only when there is a real key, so MOCK mode never imports the SDK.
async function realCallChat(apiKey: string): Promise<CallChat> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })
  return async (system, turns) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system,
      // The block shapes above are exactly what the SDK takes; the cast is
      // only because our own ModelTurn is a narrower, simpler type.
      messages: turns as unknown as Parameters<typeof client.messages.create>[0]['messages'],
    })
    return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  }
}
