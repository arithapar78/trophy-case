import { beforeEach, describe, expect, it } from 'vitest'
import { createAchievement, getPhotos } from '../../src/lib/achievements'
import { BadBackupError, backupFileName, buildBackup, deleteEverything, restoreBackup } from '../../src/lib/backup'
import { db } from '../../src/lib/db'
import { zipSync } from 'fflate'

function fakePhoto(label: string) {
  return { blob: new Blob([label], { type: 'image/jpeg' }), width: 10, height: 8 }
}

beforeEach(async () => {
  await db.photos.clear()
  await db.achievements.clear()
})

describe('backup and restore', () => {
  it('names the file by date', () => {
    expect(backupFileName(new Date(Date.UTC(2026, 8, 21, 12)))).toBe('trophy-case-backup-2026-09-21.zip')
  })

  it('round-trips every achievement and photo exactly', async () => {
    const a = await createAchievement({ title: 'Science fair', date: '2026-05-10', category: 'School', note: 'Volcano' }, [fakePhoto('one'), fakePhoto('two')])
    const b = await createAchievement({ title: 'MVP', date: '2026-01-15', category: 'Sports', organisation: 'Magic' })
    const before = await db.achievements.toArray()

    const zip = await buildBackup()
    expect(zip.type).toBe('application/zip')

    await deleteEverything()
    expect(await db.achievements.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)

    const summary = await restoreBackup(zip)
    expect(summary).toEqual({ achievements: 2, photos: 2 })

    const after = await db.achievements.toArray()
    expect(after.sort((x, y) => x.id.localeCompare(y.id))).toEqual(before.sort((x, y) => x.id.localeCompare(y.id)))
    const photos = await getPhotos(a.id)
    expect(photos.map((p) => p.order)).toEqual([0, 1])
    expect(await photos[0].blob.text()).toBe('one')
    expect(await photos[1].blob.text()).toBe('two')
    expect(await getPhotos(b.id)).toHaveLength(0)
  })

  it('restoring the same backup twice does not duplicate anything', async () => {
    await createAchievement({ title: 'Once', date: '2026-05-10', category: 'Arts' }, [fakePhoto('p')])
    const zip = await buildBackup()
    await restoreBackup(zip)
    await restoreBackup(zip)
    expect(await db.achievements.count()).toBe(1)
    expect(await db.photos.count()).toBe(1)
  })

  it('rejects a file that is not a backup, and changes nothing', async () => {
    await createAchievement({ title: 'Keep me', date: '2026-05-10', category: 'Arts' })

    const notZip = new Blob(['hello'], { type: 'text/plain' })
    await expect(restoreBackup(notZip)).rejects.toBeInstanceOf(BadBackupError)

    const zipWithoutManifest = new Blob([zipSync({ 'readme.txt': new TextEncoder().encode('hi') }) as BlobPart])
    await expect(restoreBackup(zipWithoutManifest)).rejects.toBeInstanceOf(BadBackupError)

    const wrongApp = new Blob([
      zipSync({ 'manifest.json': new TextEncoder().encode(JSON.stringify({ app: 'other', format: 1, achievements: [], photos: [] })) }) as BlobPart,
    ])
    await expect(restoreBackup(wrongApp)).rejects.toBeInstanceOf(BadBackupError)

    expect(await db.achievements.count()).toBe(1)
  })

  it('skips broken rows but keeps the good ones', async () => {
    const manifest = {
      app: 'trophy-case',
      format: 1,
      exportedAt: 'x',
      achievements: [
        { id: 'ok', title: 'Fine', date: '2026-01-01', category: 'Other', note: '', organisation: '', role: '', result: '', createdAt: 1, updatedAt: 1 },
        { id: 'bad', title: 'No category' },
      ],
      photos: [{ id: 'p1', achievementId: 'missing', order: 0, width: 1, height: 1, file: 'photos/p1.jpg' }],
    }
    const zip = new Blob([zipSync({ 'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)) }) as BlobPart])
    const summary = await restoreBackup(zip)
    expect(summary).toEqual({ achievements: 1, photos: 0 })
  })
})

describe('backup carries the goal and rankings', () => {
  it('round-trips them and reads an old format-1 backup without them', async () => {
    const { getGoal, getRankings, saveRankings, setGoal } = await import('../../src/lib/goal')
    const a = await createAchievement({ title: 'Ranked', date: '2026-05-10', category: 'School' })
    await setGoal('Engineering')
    await saveRankings([{ achievementId: a.id, rank: 1, reason: 'Because', rankedAt: 1 }])

    const zip = await buildBackup()
    await deleteEverything()
    expect(await getGoal()).toBe('')

    await restoreBackup(zip)
    expect(await getGoal()).toBe('Engineering')
    expect((await getRankings()).get(a.id)?.reason).toBe('Because')

    const oldFormat = new Blob([
      zipSync({ 'manifest.json': new TextEncoder().encode(JSON.stringify({ app: 'trophy-case', format: 1, exportedAt: 'x', achievements: [], photos: [] })) }) as BlobPart,
    ])
    expect(await restoreBackup(oldFormat)).toEqual({ achievements: 0, photos: 0 })
  })
})
