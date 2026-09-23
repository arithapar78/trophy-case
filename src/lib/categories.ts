// The user's categories: the starter list everyone gets, plus the ones they
// made. Their own are kept as one small row in the settings table.
//
// Renaming and deleting touch achievements too, so each runs in a single
// database transaction: either every achievement moves or none do.

import { db } from './db'
import { FALLBACK_CATEGORY, MAX_CUSTOM_CATEGORIES, STARTER_CATEGORIES } from './types'
import { cleanCustomCategories, fullCategoryList, validateCategoryName } from './validation'

export class CategoryError extends Error {}

const KEY = 'customCategories'

export async function getCustomCategories(): Promise<string[]> {
  const row = await db.settings.get(KEY)
  return cleanCustomCategories(row?.value)
}

// Everything the user can pick, in display order.
export async function getCategories(): Promise<string[]> {
  return fullCategoryList(await getCustomCategories())
}

function isStarter(name: string): boolean {
  return (STARTER_CATEGORIES as readonly string[]).includes(name)
}

export async function addCategory(name: string): Promise<string> {
  const custom = await getCustomCategories()
  if (custom.length >= MAX_CUSTOM_CATEGORIES) {
    throw new CategoryError(`You can have up to ${MAX_CUSTOM_CATEGORIES} of your own categories.`)
  }
  const checked = validateCategoryName(name, fullCategoryList(custom))
  if (!checked.ok) throw new CategoryError(checked.error)
  await db.settings.put({ key: KEY, value: [...custom, checked.value] })
  return checked.value
}

// Every achievement in the old category follows it to the new name.
export async function renameCategory(from: string, to: string): Promise<string> {
  if (isStarter(from)) throw new CategoryError("The starter categories can't be renamed.")
  const custom = await getCustomCategories()
  if (!custom.includes(from)) throw new CategoryError("That category isn't there any more.")
  const others = fullCategoryList(custom.filter((c) => c !== from))
  const checked = validateCategoryName(to, others)
  if (!checked.ok) throw new CategoryError(checked.error)

  const renamed = custom.map((c) => (c === from ? checked.value : c))
  await db.transaction('rw', db.settings, db.achievements, async () => {
    await db.settings.put({ key: KEY, value: renamed })
    await db.achievements.where('category').equals(from).modify({ category: checked.value, updatedAt: Date.now() })
  })
  return checked.value
}

export async function countInCategory(name: string): Promise<number> {
  return db.achievements.where('category').equals(name).count()
}

// Its achievements move to Other; nothing is deleted but the name.
// Returns how many moved.
export async function deleteCategory(name: string): Promise<number> {
  if (isStarter(name)) throw new CategoryError("The starter categories can't be deleted.")
  const custom = await getCustomCategories()
  if (!custom.includes(name)) throw new CategoryError("That category isn't there any more.")
  let moved = 0
  await db.transaction('rw', db.settings, db.achievements, async () => {
    await db.settings.put({ key: KEY, value: custom.filter((c) => c !== name) })
    moved = await db.achievements
      .where('category')
      .equals(name)
      .modify({ category: FALLBACK_CATEGORY, updatedAt: Date.now() })
  })
  return moved
}

// The filter row shows only categories with something in them, in the
// same order as the picker.
export async function categoriesInUse(): Promise<string[]> {
  const used = new Set((await db.achievements.toArray()).map((a) => a.category))
  return (await getCategories()).filter((c) => used.has(c))
}

// Used by restore: adds any of `names` the user does not have yet, as far
// as the rules and the limit allow. Returns the full list afterwards, so
// the caller can see which names made it.
export async function ensureCategories(names: readonly string[]): Promise<string[]> {
  const custom = await getCustomCategories()
  const wanted = names.filter((n) => !isStarter(n))
  const merged = cleanCustomCategories([...custom, ...wanted])
  if (merged.length !== custom.length) await db.settings.put({ key: KEY, value: merged })
  return fullCategoryList(merged)
}
