// Create, edit, delete and list achievements. All logic lives here so it can
// be unit-tested without a browser. Components call these and render the result.

import { db } from './db'
import { newId } from './ids'
import { validateAchievement, type FieldErrors } from './validation'
import type {
  Achievement,
  AchievementInput,
  AchievementWithPhotos,
  Photo,
  PhotoPlanItem,
  PreparedPhoto,
} from './types'

export class ValidationError extends Error {
  errors: FieldErrors
  constructor(errors: FieldErrors) {
    super('Some fields need fixing.')
    this.errors = errors
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("That achievement isn't there any more.")
  }
}

export interface ListOptions {
  category?: string // "All" or a category name
  search?: string
}

export async function createAchievement(
  input: AchievementInput,
  photos: PreparedPhoto[] = [],
): Promise<Achievement> {
  const checked = validateAchievement(input, photos.length)
  if (!checked.ok) throw new ValidationError(checked.errors)

  const now = Date.now()
  const achievement: Achievement = {
    id: newId(),
    ...checked.value,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.achievements, db.photos, async () => {
    await db.achievements.add(achievement)
    await db.photos.bulkAdd(
      photos.map((photo, order) => ({
        id: newId(),
        achievementId: achievement.id,
        order,
        ...photo,
      })),
    )
  })

  return achievement
}

// `plan` is the full list of photos the edit should end with, in order.
// Existing photos left out of the plan are deleted. If `plan` is omitted
// the photos are left as they are.
export async function updateAchievement(
  id: string,
  input: AchievementInput,
  plan?: PhotoPlanItem[],
): Promise<Achievement> {
  const existing = await db.achievements.get(id)
  if (!existing) throw new NotFoundError()

  const currentPhotos = await db.photos.where('achievementId').equals(id).toArray()
  const photoCount = plan ? plan.length : currentPhotos.length
  const checked = validateAchievement(input, photoCount)
  if (!checked.ok) throw new ValidationError(checked.errors)

  const updated: Achievement = {
    ...existing,
    ...checked.value,
    updatedAt: Date.now(),
  }

  await db.transaction('rw', db.achievements, db.photos, async () => {
    await db.achievements.put(updated)
    if (!plan) return

    const keepIds = new Set(plan.filter((p) => p.kind === 'existing').map((p) => p.id))
    const toDelete = currentPhotos.filter((p) => !keepIds.has(p.id)).map((p) => p.id)
    await db.photos.bulkDelete(toDelete)

    const byId = new Map(currentPhotos.map((p) => [p.id, p]))
    const finalPhotos: Photo[] = plan.map((item, order) =>
      item.kind === 'existing'
        ? { ...byId.get(item.id)!, order }
        : { id: newId(), achievementId: id, order, ...item.photo },
    )
    await db.photos.bulkPut(finalPhotos)
  })

  return updated
}

export async function deleteAchievement(id: string): Promise<void> {
  const existing = await db.achievements.get(id)
  if (!existing) throw new NotFoundError()

  await db.transaction('rw', db.achievements, db.photos, async () => {
    await db.photos.where('achievementId').equals(id).delete()
    await db.achievements.delete(id)
  })
}

export async function getPhotos(achievementId: string): Promise<Photo[]> {
  return db.photos.where('[achievementId+order]').between([achievementId, -Infinity], [achievementId, Infinity]).toArray()
}

// Newest first. Same date: the one created most recently first.
function newestFirst(a: Achievement, b: Achievement): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.createdAt - a.createdAt
}

function matchesSearch(a: Achievement, needle: string): boolean {
  const haystack = [a.title, a.note, a.organisation, a.role, a.result].join(' ').toLowerCase()
  return haystack.includes(needle)
}

export async function listAchievements(options: ListOptions = {}): Promise<Achievement[]> {
  const category = options.category && options.category !== 'All' ? options.category : undefined
  const needle = (options.search ?? '').trim().toLowerCase()

  let rows = category
    ? await db.achievements.where('category').equals(category).toArray()
    : await db.achievements.toArray()

  if (needle) rows = rows.filter((a) => matchesSearch(a, needle))

  return rows.sort(newestFirst)
}

// The timeline needs each achievement's photos to show the cover. A few
// hundred rows at most, so loading them all at once is fine.
export async function listAchievementsWithPhotos(
  options: ListOptions = {},
): Promise<AchievementWithPhotos[]> {
  const achievements = await listAchievements(options)
  const allPhotos = await db.photos.toArray()
  const byAchievement = new Map<string, Photo[]>()
  for (const photo of allPhotos) {
    const list = byAchievement.get(photo.achievementId) ?? []
    list.push(photo)
    byAchievement.set(photo.achievementId, list)
  }
  return achievements.map((achievement) => ({
    achievement,
    photos: (byAchievement.get(achievement.id) ?? []).sort((a, b) => a.order - b.order),
  }))
}
