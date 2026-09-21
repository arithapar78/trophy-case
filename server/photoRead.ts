// The AI photo read, server side. This runs inside the Vercel function,
// never on the phone. It receives a small JPEG, asks Claude Haiku what the
// achievement is, and returns a draft. With no API key it returns a
// clearly labelled MOCK draft instead, so development and tests never call
// the real API.
//
// It stores nothing.

import { MAX_IMAGE_BASE64_LENGTH, type PhotoDraft, type ReadPhotoRequest, type ReadPhotoResponse } from '../src/lib/aiTypes'
import { CATEGORIES, type Category } from '../src/lib/types'
import { isValidISODate } from '../src/lib/dates'

export const MODEL = 'claude-haiku-4-5'

// Asks the model and returns its raw text answer. Injected so tests can
// fake it and so MOCK mode never touches the network.
export type CallModel = (imageBase64: string, prompt: string) => Promise<string>

export interface ReadPhotoOptions {
  apiKey?: string
  callModel?: CallModel
}

const PROMPT = `This photo shows a student's achievement: a certificate, medal, trophy, scoreboard, finished project, or similar.
Describe it as one saved achievement. Reply with JSON only, no other text, in exactly this shape:
{"title": string, "category": string, "date": string | null, "note": string}
Rules:
- title: short and specific, under 100 characters, like "Regional Science Fair, 1st place"
- category: one of School, Sports, Debate, Cooking, Arts, Other
- date: the date shown in the photo as YYYY-MM-DD, or null if none is visible
- note: one sentence with any useful detail visible (organisation, place, score). Empty string if nothing more.
Do not invent names, scores or dates that are not visible.`

export function mockDraft(today: string): PhotoDraft {
  return {
    title: 'MOCK: Certificate of achievement',
    category: 'School',
    date: today,
    note: 'MOCK: sample draft. Add an API key to the AI function for real results.',
  }
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

// Turns whatever the model said into a safe draft. Anything odd falls
// back to something the user can fix by hand.
export function parseModelAnswer(text: string, today: string): PhotoDraft {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  let raw: Record<string, unknown> = {}
  if (start !== -1 && end > start) {
    try {
      raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    } catch {
      raw = {}
    }
  }
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 120) : ''
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, 500) : ''
  const date = typeof raw.date === 'string' && isValidISODate(raw.date) && raw.date <= today ? raw.date : today
  return {
    title: title || 'Achievement',
    category: isCategory(raw.category) ? raw.category : 'Other',
    date,
    note,
  }
}

export function checkRequest(body: unknown): body is ReadPhotoRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Partial<ReadPhotoRequest>
  return typeof b.imageBase64 === 'string' && b.imageBase64.length > 0 && typeof b.today === 'string' && isValidISODate(b.today)
}

export async function readPhoto(body: unknown, options: ReadPhotoOptions = {}): Promise<ReadPhotoResponse> {
  if (!checkRequest(body)) return { ok: false, message: 'No photo was sent.' }
  if (body.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return { ok: false, message: 'That photo is too big to send. Try again.' }
  }

  if (!options.apiKey) return { ok: true, draft: mockDraft(body.today), mock: true }

  const callModel = options.callModel ?? (await realCallModel(options.apiKey))
  try {
    const answer = await callModel(body.imageBase64, PROMPT)
    return { ok: true, draft: parseModelAnswer(answer, body.today), mock: false }
  } catch {
    return { ok: false, message: "The AI couldn't read that photo. Fill it in yourself this time." }
  }
}

// Loaded only when there is a real key, so MOCK mode never even imports the SDK.
async function realCallModel(apiKey: string): Promise<CallModel> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })
  return async (imageBase64, prompt) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })
    return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  }
}
