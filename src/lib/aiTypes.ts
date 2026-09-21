// Shapes shared by the app (phone) and the AI function (server).

import type { Category } from './types'

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
