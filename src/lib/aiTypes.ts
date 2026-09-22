// Shapes shared by the app (phone) and the AI function (server).

import type { Category } from './types.js'

// What the AI hands back: a draft the user can change before saving.
export interface PhotoDraft {
  title: string
  category: Category
  date: string // "YYYY-MM-DD"
  note: string
}

export interface ReadPhotoRequest {
  // A JPEG, base64 encoded, already resized to about 1024 px.
  imageBase64: string
  // The phone's date, so a "recently" guess lands on the right day.
  today: string
}

export type ReadPhotoResponse =
  | { ok: true; draft: PhotoDraft; mock: boolean }
  | { ok: false; message: string }

// About 1024 px of JPEG is 100 to 300 KB. Base64 adds a third. Anything
// past this was not resized and is refused.
export const MAX_IMAGE_BASE64_LENGTH = 1_500_000

// What the ranking and recommendation calls send: the goal plus the text
// of every achievement. Never photos.
export interface AchievementSummary {
  id: string
  title: string
  category: string
  date: string
  note: string
  organisation: string
  role: string
  result: string
}

export interface GoalRequest {
  goal: string
  achievements: AchievementSummary[]
}

export interface RankItem {
  id: string
  rank: number
  reason: string
}

export type RankResponse =
  | { ok: true; ranks: RankItem[]; mock: boolean }
  | { ok: false; message: string }

export interface SuggestionItem {
  title: string
  why: string
}

export type RecommendResponse =
  | { ok: true; suggestions: SuggestionItem[]; mock: boolean }
  | { ok: false; message: string }

export const MAX_ACHIEVEMENTS_PER_REQUEST = 500

// ---- Scout (Phase 7) ----
//
// Scout is the chat that already knows the goal and the achievements. Every
// message carries the goal, the words of every achievement, the recent
// conversation, and at most one attached file.

export type ScoutRole = 'user' | 'scout'

export interface ScoutTurn {
  role: ScoutRole
  text: string
}

// A file the user attached to one message. Sent once, saved nowhere.
export type AttachmentKind = 'image' | 'pdf' | 'text'

export interface ScoutAttachment {
  kind: AttachmentKind
  name: string
  // Images and PDFs: base64. Text files: the text itself.
  data: string
  // Only for images, so the model is told what it is looking at.
  mediaType?: string
}

export interface ScoutRequest {
  message: string
  goal: string
  achievements: AchievementSummary[]
  // Oldest first. The app sends only the recent part of the conversation.
  history: ScoutTurn[]
  today: string
  attachment?: ScoutAttachment
}

// When Scout spots an achievement worth saving it offers one of these. It is
// only ever a suggestion: nothing reaches the database until the user taps
// Save. The fields match what the New achievement form would collect.
export interface ProposedAchievement {
  title: string
  category: Category
  date: string
  note: string
  organisation: string
  role: string
  result: string
}

export type ScoutResponse =
  | { ok: true; reply: string; proposed?: ProposedAchievement; mock: boolean }
  | { ok: false; message: string }

// How much conversation travels with each message. Enough for Scout to
// follow a thread, small enough that a long chat does not grow the cost
// without limit.
export const SCOUT_HISTORY_TURNS = 12
export const MAX_SCOUT_MESSAGE_LENGTH = 2000

// Attachment caps, checked on the phone before anything is sent and again on
// the server. Base64 is about a third bigger than the file it encodes, so
// this is roughly a 3 MB file.
export const MAX_ATTACHMENT_BASE64_LENGTH = 4_500_000
export const MAX_ATTACHMENT_TEXT_LENGTH = 200_000
