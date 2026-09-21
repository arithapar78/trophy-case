// The one place the rules for a valid achievement live. Used by the form
// (to show inline errors) and by the save functions (so bad data can never
// be stored, whichever way it arrives).

import { isFutureDate, isValidISODate, todayISO } from './dates'
import { CATEGORIES, MAX_PHOTOS, type Achievement, type AchievementInput, type Category } from './types'

export const LIMITS = {
  title: 120,
  note: 500,
  organisation: 80,
  role: 80,
  result: 80,
} as const

export type FieldErrors = Partial<Record<keyof AchievementInput | 'photos', string>>

// The cleaned-up values, ready to store. Only present when validation passes.
export type ValidAchievement = Pick<
  Achievement,
  'title' | 'date' | 'category' | 'note' | 'organisation' | 'role' | 'result'
>

export type ValidationResult =
  | { ok: true; value: ValidAchievement }
  | { ok: false; errors: FieldErrors }

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

export function validateAchievement(
  input: AchievementInput,
  photoCount = 0,
  today: string = todayISO(),
): ValidationResult {
  const errors: FieldErrors = {}

  const title = input.title.trim()
  if (title.length === 0) errors.title = 'Give it a title.'
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`

  if (!isValidISODate(input.date)) errors.date = 'Pick a real date.'
  else if (isFutureDate(input.date, today)) errors.date = "That date hasn't happened yet."

  if (!isCategory(input.category)) errors.category = 'Pick a category.'

  const note = (input.note ?? '').trim()
  if (note.length > LIMITS.note) errors.note = `Keep the note under ${LIMITS.note} characters.`

  const organisation = (input.organisation ?? '').trim()
  if (organisation.length > LIMITS.organisation) {
    errors.organisation = `Keep this under ${LIMITS.organisation} characters.`
  }
  const role = (input.role ?? '').trim()
  if (role.length > LIMITS.role) errors.role = `Keep this under ${LIMITS.role} characters.`
  const result = (input.result ?? '').trim()
  if (result.length > LIMITS.result) errors.result = `Keep this under ${LIMITS.result} characters.`

  if (photoCount > MAX_PHOTOS) errors.photos = `You can add up to ${MAX_PHOTOS} photos.`

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      date: input.date,
      category: input.category as Category,
      note,
      organisation,
      role,
      result,
    },
  }
}
