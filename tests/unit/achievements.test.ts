import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../src/lib/db'
import {
  createAchievement,
  deleteAchievement,
  getPhotos,
  listAchievements,
  listAchievementsWithPhotos,
  NotFoundError,
  updateAchievement,
  ValidationError,
} from '../../src/lib/achievements'
import type { PreparedPhoto } from '../../src/lib/types'

function readBlob(blob: Blob): Promise<string> {
  return blob.text()
}

function fakePhoto(label: string): PreparedPhoto {
  return { blob: new Blob([label], { type: 'image/jpeg' }), width: 100, height: 80 }
}

const base = { title: 'Science fair 1st place', date: '2026-05-10', category: 'School' }

beforeEach(async () => {
  await db.photos.clear()
  await db.achievements.clear()
})

describe('create', () => {
  it('saves a valid achievement with photos in order', async () => {
    const saved = await createAchievement({ ...base, note: 'Volcano' }, [fakePhoto('a'), fakePhoto('b')])
    expect(saved.id).toBeTruthy()
    expect(await db.achievements.count()).toBe(1)
    const photos = await getPhotos(saved.id)
    expect(photos.map((p) => p.order)).toEqual([0, 1])
    expect(await readBlob(photos[0].blob)).toBe('a')
  })

  it('refuses invalid data and stores nothing', async () => {
    await expect(createAchievement({ ...base, title: '' })).rejects.toBeInstanceOf(ValidationError)
    await expect(createAchievement({ ...base, date: '2099-01-01' })).rejects.toBeInstanceOf(ValidationError)
    await expect(createAchievement({ ...base, category: 'Nope' })).rejects.toBeInstanceOf(ValidationError)
    await expect(createAchievement(base, Array(6).fill(fakePhoto('x')))).rejects.toBeInstanceOf(ValidationError)
    expect(await db.achievements.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
  })
})

describe('update', () => {
  it('changes the stored values', async () => {
    const saved = await createAchievement(base)
    await updateAchievement(saved.id, { ...base, title: 'Science fair 2nd place', result: '2nd' })
    const row = await db.achievements.get(saved.id)
    expect(row?.title).toBe('Science fair 2nd place')
    expect(row?.result).toBe('2nd')
    expect(row?.updatedAt).toBeGreaterThanOrEqual(saved.updatedAt)
  })

  it('leaves the original untouched when the new data is invalid', async () => {
    const saved = await createAchievement(base)
    await expect(updateAchievement(saved.id, { ...base, title: '' })).rejects.toBeInstanceOf(ValidationError)
    expect((await db.achievements.get(saved.id))?.title).toBe(base.title)
  })

  it('applies a photo plan: keep, drop, add, reorder', async () => {
    const saved = await createAchievement(base, [fakePhoto('a'), fakePhoto('b'), fakePhoto('c')])
    const [a, , c] = await getPhotos(saved.id)
    await updateAchievement(saved.id, base, [
      { kind: 'existing', id: c.id },
      { kind: 'new', photo: fakePhoto('d') },
      { kind: 'existing', id: a.id },
    ])
    const after = await getPhotos(saved.id)
    expect(await Promise.all(after.map((p) => readBlob(p.blob)))).toEqual(['c', 'd', 'a'])
    expect(after.map((p) => p.order)).toEqual([0, 1, 2])
    expect(await db.photos.count()).toBe(3)
  })

  it('fails cleanly for an unknown id', async () => {
    await expect(updateAchievement('nope', base)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('delete', () => {
  it('removes the achievement and its photos', async () => {
    const saved = await createAchievement(base, [fakePhoto('a')])
    const other = await createAchievement({ ...base, title: 'Other' }, [fakePhoto('b')])
    await deleteAchievement(saved.id)
    expect(await db.achievements.get(saved.id)).toBeUndefined()
    expect(await getPhotos(saved.id)).toHaveLength(0)
    expect(await getPhotos(other.id)).toHaveLength(1)
  })

  it('fails cleanly for an unknown id', async () => {
    await expect(deleteAchievement('nope')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('list', () => {
  beforeEach(async () => {
    await createAchievement({ title: 'Old regional final', date: '2025-03-01', category: 'Clubs & Leadership', note: 'Boston' })
    await createAchievement({ title: 'Basketball MVP', date: '2026-01-15', category: 'Sports', organisation: 'Middlesex Magic' })
    await createAchievement({ title: 'First on same day', date: '2026-04-02', category: 'Arts' })
    await createAchievement({ title: 'Second on same day', date: '2026-04-02', category: 'Community Service', role: 'Sous chef' })
  })

  it('returns newest first, most recently created first on a tie', async () => {
    const titles = (await listAchievements()).map((a) => a.title)
    expect(titles).toEqual(['Second on same day', 'First on same day', 'Basketball MVP', 'Old regional final'])
  })

  it('filters by category, and "All" means everything', async () => {
    expect((await listAchievements({ category: 'Sports' })).map((a) => a.title)).toEqual(['Basketball MVP'])
    expect(await listAchievements({ category: 'All' })).toHaveLength(4)
  })

  it('searches every text field, ignoring case', async () => {
    expect((await listAchievements({ search: 'basketball' })).map((a) => a.title)).toEqual(['Basketball MVP'])
    expect((await listAchievements({ search: 'BOSTON' }))[0].title).toBe('Old regional final')
    expect((await listAchievements({ search: 'magic' }))[0].title).toBe('Basketball MVP')
    expect((await listAchievements({ search: 'sous' }))[0].title).toBe('Second on same day')
  })

  it('combines search and category', async () => {
    expect(await listAchievements({ search: 'same day', category: 'Arts' })).toHaveLength(1)
    expect(await listAchievements({ search: 'same day', category: 'Sports' })).toHaveLength(0)
  })

  it('attaches photos to each row', async () => {
    const saved = await createAchievement({ ...base, title: 'With photo' }, [fakePhoto('a')])
    const rows = await listAchievementsWithPhotos({ search: 'with photo' })
    expect(rows[0].achievement.id).toBe(saved.id)
    expect(rows[0].photos).toHaveLength(1)
  })
})

describe('creation order', () => {
  it('keeps two achievements saved in the same millisecond in order', async () => {
    // Freeze the clock so both saves really do land on the same millisecond.
    const frozen = Date.now()
    const spy = vi.spyOn(Date, 'now').mockReturnValue(frozen)
    try {
      for (const title of ['One', 'Two', 'Three']) {
        await createAchievement({ title, date: '2026-05-01', category: 'Other' })
      }
    } finally {
      spy.mockRestore()
    }
    const titles = (await listAchievements({ search: '' })).map((a) => a.title)
    expect(titles.slice(0, 3)).toEqual(['Three', 'Two', 'One'])
  })
})
