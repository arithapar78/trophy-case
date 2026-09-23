// The one place the rules for a valid achievement live. Used by the form
// (to show inline errors) and by the save functions (so bad data can never
// be stored, whichever way it arrives).

// The server imports this file too (to check the category lists the AI is
// given), so its imports spell out ".js". See gotcha 1 in HANDOFF.md.
import { isFutureDate, isValidISODate, todayISO } from './dates.js'
import {
  FALLBACK_CATEGORY,
  MAX_CATEGORY_LENGTH,
  MAX_CUSTOM_CATEGORIES,
  MAX_PHOTOS,
  STARTER_CATEGORIES,
  type Achievement,
  type AchievementInput,
} from './types.js'

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

// `categories` is the user's full list (starter plus their own). It
// defaults to the starter list so a caller that has not loaded the user's
// list can never accept a made-up category.
export function validateAchievement(
  input: AchievementInput,
  photoCount = 0,
  today: string = todayISO(),
  categories: readonly string[] = STARTER_CATEGORIES,
): ValidationResult {
  const errors: FieldErrors = {}

  const title = input.title.trim()
  if (title.length === 0) errors.title = 'Give it a title.'
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`

  if (!isValidISODate(input.date)) errors.date = 'Pick a real date.'
  else if (isFutureDate(input.date, today)) errors.date = "That date hasn't happened yet."

  if (!categories.includes(input.category)) errors.category = 'Pick a category.'

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
      category: input.category,
      note,
      organisation,
      role,
      result,
    },
  }
}

// ---- Categories (Phase 9) ----

// Tidies a typed name: trims the ends and squashes runs of spaces, so
// "  Model   UN " and "Model UN" are the same category.
export function cleanCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export type CategoryNameResult = { ok: true; value: string } | { ok: false; error: string }

// The rules for a new or renamed category. `existing` is every name already
// on the list (leave out the one being renamed). Capitals are ignored when
// checking for a repeat, so "debate" cannot sit next to "Debate".
export function validateCategoryName(name: string, existing: readonly string[]): CategoryNameResult {
  const value = cleanCategoryName(name)
  if (value.length === 0) return { ok: false, error: 'Give the category a name.' }
  if (value.length > MAX_CATEGORY_LENGTH) return { ok: false, error: `Keep it under ${MAX_CATEGORY_LENGTH} characters.` }
  if (value.toLowerCase() === 'all') return { ok: false, error: '"All" is taken by the filter. Pick another name.' }
  const lower = value.toLowerCase()
  if (existing.some((c) => c.toLowerCase() === lower)) return { ok: false, error: 'You already have that category.' }
  return { ok: true, value }
}

// The full list in the order the app shows it: the starter ones, then the
// user's own, then Other last.
export function fullCategoryList(custom: readonly string[]): string[] {
  const starters = STARTER_CATEGORIES.filter((c) => c !== FALLBACK_CATEGORY)
  return [...starters, ...custom, FALLBACK_CATEGORY]
}

// Cleans a list of the user's own categories that came from somewhere we do
// not control: an old database, a backup file, or a request to the server.
// Drops anything that breaks the rules, repeats, or clashes with a starter
// category, and keeps at most the allowed number.
export function cleanCustomCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const kept: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const checked = validateCategoryName(item, [...STARTER_CATEGORIES, ...kept])
    if (checked.ok) kept.push(checked.value)
    if (kept.length === MAX_CUSTOM_CATEGORIES) break
  }
  return kept
}

// For the server: the category list the phone sent, checked, or the starter
// list if it sent nothing usable. The phone sends its full list, so the
// starter names are filtered out before cleaning and added back.
export function categoryListFromRequest(raw: unknown): string[] {
  if (!Array.isArray(raw)) return fullCategoryList([])
  const starters = new Set<string>(STARTER_CATEGORIES)
  const custom = raw.filter((c) => typeof c !== 'string' || !starters.has(c))
  return fullCategoryList(cleanCustomCategories(custom))
}

// For anything the AI names: a category on the list, or Other.
export function categoryOrFallback(value: unknown, categories: readonly string[]): string {
  return typeof value === 'string' && categories.includes(value) ? value : FALLBACK_CATEGORY
}
