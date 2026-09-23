// The phone's side of Scout: the saved conversation, turning a chosen file
// into something sendable, and asking the function for an answer.
//
// The conversation lives in the device's own database like everything else.
// A file is sent with one message and never stored.

import { AiUnavailableError, postAi } from './aiClient'
import type {
  AchievementSummary,
  ProposedAchievement,
  ScoutAttachment,
  ScoutRequest,
  ScoutResponse,
  ScoutTurn,
} from './aiTypes'
import { MAX_ATTACHMENT_BASE64_LENGTH, MAX_ATTACHMENT_TEXT_LENGTH, SCOUT_HISTORY_TURNS } from './aiTypes'
import { todayISO } from './dates'
import { db } from './db'
import { newId } from './ids'
import { prepareForStorage } from './photos'
import type { Achievement, ScoutMessage } from './types'
import { getCategories } from './categories'

const SEND_SIDE = 1024
const JPEG_QUALITY = 0.8

// What the file picker offers. On an iPhone this is what makes the sheet
// show Photo Library, Take Photo and Browse (Files) rather than just one of
// them; on a computer it is the ordinary file dialog.
export const SCOUT_FILE_ACCEPT = 'image/*,application/pdf,text/plain,text/markdown,text/csv,.txt,.md,.csv'

// Roughly 3 MB of file. Base64 is about a third bigger than the bytes it
// encodes, which is why the cap below is larger than the file it allows.
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024

const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv', 'text/x-markdown', ''])
const TEXT_EXTENSIONS = /\.(txt|md|csv|log)$/i

export type AttachmentCheck = { ok: true } | { ok: false; message: string }

export function checkAttachmentFile(file: { type: string; size: number; name: string }): AttachmentCheck {
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isText = TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(file.name)
  if (!isImage && !isPdf && !isText) {
    return { ok: false, message: 'Scout can read pictures, PDFs and plain text files. That one is something else.' }
  }
  // Images are shrunk before sending, so their original size does not matter.
  if (!isImage && file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, message: 'That file is too big to send. About 3 MB is the most Scout can take.' }
  }
  return { ok: true }
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

// Turns the file the user chose into the shape the function takes. Pictures
// are shrunk and re-encoded, which is also what strips EXIF (where the photo
// was taken, and when), exactly as photos are handled everywhere else.
export async function prepareAttachment(file: File): Promise<ScoutAttachment> {
  const check = checkAttachmentFile(file)
  if (!check.ok) throw new AiUnavailableError(check.message)

  if (file.type.startsWith('image/')) {
    const small = await prepareForStorage(file, SEND_SIDE, JPEG_QUALITY)
    const data = await toBase64(small.blob)
    if (data.length > MAX_ATTACHMENT_BASE64_LENGTH) throw new AiUnavailableError('That picture is too big to send.')
    return { kind: 'image', name: file.name, data, mediaType: 'image/jpeg' }
  }

  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const data = await toBase64(file)
    if (data.length > MAX_ATTACHMENT_BASE64_LENGTH) throw new AiUnavailableError('That PDF is too big to send. Try about 3 MB or less.')
    return { kind: 'pdf', name: file.name, data }
  }

  const text = await file.text()
  if (text.length > MAX_ATTACHMENT_TEXT_LENGTH) throw new AiUnavailableError('That text file is too long to send. Try a shorter one.')
  return { kind: 'text', name: file.name, data: text }
}

// --- The saved conversation ---

export async function listScoutMessages(): Promise<ScoutMessage[]> {
  return db.scoutMessages.orderBy('at').toArray()
}

export async function addScoutMessage(message: Omit<ScoutMessage, 'id' | 'at'> & { at?: number }): Promise<ScoutMessage> {
  const saved: ScoutMessage = { id: newId(), at: message.at ?? Date.now(), ...message }
  await db.scoutMessages.put(saved)
  return saved
}

export async function clearScoutMessages(): Promise<void> {
  await db.scoutMessages.clear()
}

// Saved or turned down: either way the card should stop being offered.
export async function resolveProposal(messageId: string): Promise<void> {
  await db.scoutMessages.update(messageId, { proposedResolved: true })
}

// The offer still waiting for an answer, if there is one. Only the newest
// counts: an older untouched offer is stale once the conversation moved on.
export function pendingProposal(messages: ScoutMessage[]): ScoutMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.proposed && !message.proposedResolved) return message
    if (message.proposed) return undefined
  }
  return undefined
}

// --- Asking ---

function summarise(achievements: Achievement[]): AchievementSummary[] {
  return achievements.map(({ id, title, category, date, note, organisation, role, result }) => ({
    id, title, category, date, note, organisation, role, result,
  }))
}

// Only the recent part of the conversation travels, so a long chat does not
// make every message more expensive than the last.
export function toHistory(messages: ScoutMessage[]): ScoutTurn[] {
  return messages
    .filter((m) => !m.failed && m.text.trim())
    .slice(-SCOUT_HISTORY_TURNS)
    .map((m) => ({ role: m.role, text: m.text }))
}

export interface ScoutAnswer {
  reply: string
  proposed?: ProposedAchievement
  mock: boolean
}

export async function askScout(options: {
  message: string
  goal: string
  achievements: Achievement[]
  history: ScoutMessage[]
  attachment?: ScoutAttachment
}): Promise<ScoutAnswer> {
  const body: ScoutRequest = {
    message: options.message,
    goal: options.goal,
    achievements: summarise(options.achievements),
    history: toHistory(options.history),
    today: todayISO(),
    attachment: options.attachment,
    categories: await getCategories(),
  }
  const result = await postAi<ScoutResponse>('/api/scout', body)
  if (!result.ok) throw new AiUnavailableError(result.message)
  return { reply: result.reply, proposed: result.proposed, mock: result.mock }
}
