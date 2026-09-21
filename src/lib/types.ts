// Shared shapes. Everything the app stores is described here.

export const CATEGORIES = ['School', 'Sports', 'Debate', 'Cooking', 'Arts', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

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
