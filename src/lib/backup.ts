// Backup and restore. A backup is one zip file:
//
//   manifest.json          every achievement, plus a list of photos
//   photos/<photo id>.jpg  the photo files
//
// Restoring merges by id, so importing the same backup twice changes nothing.

import { unzipSync, zipSync } from 'fflate'
import { db } from './db'
import { CATEGORIES, type Achievement, type Photo, type Ranking, type RecommendationSet } from './types'
import { getGoal, getRecommendations, setGoal, setRecommendations } from './goal'

export const BACKUP_APP = 'trophy-case'
export const BACKUP_FORMAT = 2

interface PhotoEntry {
  id: string
  achievementId: string
  order: number
  width: number
  height: number
  file: string
}

interface Manifest {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  achievements: Achievement[]
  photos: PhotoEntry[]
  // Added in format 2. Older backups simply don't have them.
  goal?: string
  rankings?: Ranking[]
  recommendations?: RecommendationSet
}

export interface BackupSummary {
  achievements: number
  photos: number
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `trophy-case-backup-${stamp}.zip`
}

export async function buildBackup(): Promise<Blob> {
  const achievements = await db.achievements.toArray()
  const photos = await db.photos.toArray()

  const files: Record<string, Uint8Array> = {}
  const entries: PhotoEntry[] = []
  for (const photo of photos) {
    const file = `photos/${photo.id}.jpg`
    files[file] = new Uint8Array(await photo.blob.arrayBuffer())
    entries.push({
      id: photo.id,
      achievementId: photo.achievementId,
      order: photo.order,
      width: photo.width,
      height: photo.height,
      file,
    })
  }

  const manifest: Manifest = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    achievements,
    photos: entries,
    goal: await getGoal(),
    rankings: await db.rankings.toArray(),
    recommendations: await getRecommendations(),
  }
  files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2))

  // Photos are already compressed JPEGs, so store them as-is (level 0).
  const zipped = zipSync(files, { level: 0 })
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

export class BadBackupError extends Error {}

function isManifest(value: unknown): value is Manifest {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Partial<Manifest>
  return m.app === BACKUP_APP && typeof m.format === 'number' && Array.isArray(m.achievements) && Array.isArray(m.photos)
}

function isAchievement(value: unknown): value is Achievement {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Partial<Achievement>
  return (
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.date === 'string' &&
    typeof a.category === 'string' &&
    (CATEGORIES as readonly string[]).includes(a.category)
  )
}

export async function restoreBackup(file: Blob): Promise<BackupSummary> {
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new BadBackupError("That file isn't a Trophy Case backup.")
  }

  const manifestBytes = unzipped['manifest.json']
  if (!manifestBytes) throw new BadBackupError("That file isn't a Trophy Case backup.")

  let manifest: unknown
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes))
  } catch {
    throw new BadBackupError("That backup file is damaged and can't be read.")
  }
  if (!isManifest(manifest)) throw new BadBackupError("That file isn't a Trophy Case backup.")
  if (manifest.format > BACKUP_FORMAT) {
    throw new BadBackupError('That backup came from a newer version of Trophy Case. Update the app and try again.')
  }

  const achievements = manifest.achievements.filter(isAchievement).map((a) => ({
    ...a,
    note: a.note ?? '',
    organisation: a.organisation ?? '',
    role: a.role ?? '',
    result: a.result ?? '',
  }))
  const knownIds = new Set(achievements.map((a) => a.id))

  const photos: Photo[] = []
  for (const entry of manifest.photos) {
    const bytes = unzipped[entry.file]
    if (!bytes || !knownIds.has(entry.achievementId)) continue
    photos.push({
      id: entry.id,
      achievementId: entry.achievementId,
      order: entry.order,
      width: entry.width,
      height: entry.height,
      blob: new Blob([bytes as BlobPart], { type: 'image/jpeg' }),
    })
  }

  // bulkPut replaces rows with the same id, which is what makes a second
  // restore a no-op instead of a duplicate.
  const rankings = (manifest.rankings ?? []).filter(
    (r) => knownIds.has(r.achievementId) && typeof r.rank === 'number' && typeof r.reason === 'string',
  )

  await db.transaction('rw', db.achievements, db.photos, db.rankings, db.settings, async () => {
    await db.achievements.bulkPut(achievements)
    await db.photos.bulkPut(photos)
    await db.rankings.bulkPut(rankings)
    if (typeof manifest.goal === 'string' && manifest.goal) await setGoal(manifest.goal)
    if (manifest.recommendations?.items) await setRecommendations(manifest.recommendations)
  })

  return { achievements: achievements.length, photos: photos.length }
}

export async function deleteEverything(): Promise<void> {
  await db.transaction('rw', db.achievements, db.photos, db.rankings, db.settings, async () => {
    await db.photos.clear()
    await db.achievements.clear()
    await db.rankings.clear()
    await db.settings.clear()
  })
}
