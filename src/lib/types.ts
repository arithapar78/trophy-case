// Shared shapes. Everything the app stores is described here.

import type { ProposedAchievement } from './aiTypes.js'

// Everyone starts with these. Broad on purpose, so they fit most students;
// anything more specific (Debate, Robotics, Chess) is a category the user
// makes themselves. "Other" is always last and can never be removed, because
// it is where achievements go when their category is deleted.
export const STARTER_CATEGORIES = [
  'School',
  'Sports',
  'Arts',
  'Community Service',
  'Work',
  'Clubs & Leadership',
  'Awards',
  'Other',
] as const
export const FALLBACK_CATEGORY = 'Other'
export const MAX_CUSTOM_CATEGORIES = 20
export const MAX_CATEGORY_LENGTH = 30

// A category is now any name on the user's list: a starter one or one they
// made. Which names are allowed is checked in validation.ts.
export type Category = string

// One saved win. Dates are stored as "YYYY-MM-DD" text so they sort
// correctly and never shift with the phone's timezone.
export interface Achievement {
  id: string
  title: string
  date: string
  category: Category
  note: string
  organisation: string
  role: string
  result: string
  createdAt: number
  updatedAt: number
}

// One stored photo. The blob is the resized, EXIF-free image data.
export interface Photo {
  id: string
  achievementId: string
  order: number
  blob: Blob
  width: number
  height: number
}

// What the form hands to the save functions. Optional text defaults to "".
export interface AchievementInput {
  title: string
  date: string
  category: string
  note?: string
  organisation?: string
  role?: string
  result?: string
}

// A photo that has been resized and is ready to store.
export interface PreparedPhoto {
  blob: Blob
  width: number
  height: number
}

// How the edit form describes the photos it wants to end up with, in order.
// "existing" keeps a stored photo; "new" adds one just chosen.
export type PhotoPlanItem =
  | { kind: 'existing'; id: string }
  | { kind: 'new'; photo: PreparedPhoto }

export interface AchievementWithPhotos {
  achievement: Achievement
  photos: Photo[]
}

export const MAX_PHOTOS = 5

// One sentence the user is aiming at, like "get into a top engineering school".
export const MAX_GOAL_LENGTH = 200

// How one achievement ranks against the goal. Kept until the user ranks again.
export interface Ranking {
  achievementId: string
  rank: number // 1 = matters most
  reason: string
  rankedAt: number
}

// A suggested next achievement for the goal.
export interface Recommendation {
  title: string
  why: string
}

export interface RecommendationSet {
  goal: string
  items: Recommendation[]
  createdAt: number
}

// Small key/value rows: the goal, the last recommendations, and the
// categories the user made (Phase 9).
export interface Setting {
  key: 'goal' | 'recommendations' | 'customCategories'
  value: unknown
}

// One line of the Scout conversation, kept on the device like everything
// else. `pending` marks a message still waiting for an answer, so a failed
// send can be shown rather than silently lost.
export interface ScoutMessage {
  id: string
  role: 'user' | 'scout'
  text: string
  at: number
  // An achievement Scout offered to save with this message. Kept with the
  // conversation rather than in the screen's memory, so tapping through to
  // the Timeline and back does not lose the offer. `proposedResolved` marks
  // it as already saved or turned down.
  proposed?: ProposedAchievement
  proposedResolved?: boolean
  // The name of a file attached to this message, so the chat can show that
  // one was sent. The file itself is never stored.
  attachmentName?: string
  failed?: boolean
}
