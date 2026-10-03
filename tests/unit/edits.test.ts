// Phase 11: applying Scout's proposed edits, and undoing them.
//
// These run against the real device database (via fake-indexeddb), exactly
// like the other src/lib unit tests.

import { beforeEach, describe, expect, it } from 'vitest'
import { applyChangeBatch, getUndoInfo, undoLastBatch } from '../../src/lib/edits'
import { createAchievement } from '../../src/lib/achievements'
import { db } from '../../src/lib/db'

const base = { title: 'Science fair 1st place', date: '2026-05-10', category: 'School' }

beforeEach(async () => {
  await db.achievements.clear()
  await db.settings.clear()
})

describe('T11.2 applying Scout edits', () => {
  it('updates only the changes passed in, and records them for undo', async () => {
    const a = await createAchievement({ ...base, organisation: 'Old Club' })
    const report = await applyChangeBatch([
      { achievementId: a.id, field: 'organisation', old: 'Old Club', new: 'Middlesex Magic' },
    ])
    expect(report.applied).toHaveLength(1)
    expect(report.skipped).toBe(0)
    expect((await db.achievements.get(a.id))?.organisation).toBe('Middlesex Magic')

    // Only the ticked ones were passed, and only those changed.
    const unchanged = await createAchievement({ ...base, title: 'Robotics' })
    const report2 = await applyChangeBatch([
      { achievementId: a.id, field: 'result', old: '', new: 'Finalist' },
    ])
    expect(report2.applied.map((c) => c.achievementId)).toEqual([a.id])
    expect((await db.achievements.get(unchanged.id))?.result).toBe('')
  })

  it('skips a change whose old value no longer matches (edited since)', async () => {
    const a = await createAchievement(base)
    const report = await applyChangeBatch([
      { achievementId: a.id, field: 'organisation', old: 'Stale value', new: 'Middlesex Magic' },
    ])
    expect(report.applied).toHaveLength(0)
    expect(report.skipped).toBe(1)
    expect((await db.achievements.get(a.id))?.organisation).toBe('')
  })

  it('skips a change whose new value fails the same validation as the form', async () => {
    const a = await createAchievement(base)
    const report = await applyChangeBatch([
      { achievementId: a.id, field: 'title', old: base.title, new: 'x'.repeat(121) },
    ])
    expect(report.applied).toHaveLength(0)
    expect(report.skipped).toBe(1)
    expect((await db.achievements.get(a.id))?.title).toBe(base.title)
  })

  it('skips a change for an achievement that no longer exists', async () => {
    const report = await applyChangeBatch([
      { achievementId: 'missing', field: 'result', old: '', new: 'Finalist' },
    ])
    expect(report.applied).toHaveLength(0)
    expect(report.skipped).toBe(1)
  })

  it('accepts a category change to a real category and nothing else touches it', async () => {
    const a = await createAchievement(base)
    const report = await applyChangeBatch([
      { achievementId: a.id, field: 'category', old: 'School', new: 'Sports' },
    ])
    expect(report.skipped).toBe(0)
    expect((await db.achievements.get(a.id))?.category).toBe('Sports')
  })
})

describe('T11.2 undoing an edit', () => {
  it('restores exactly the old values, until the next confirmed change', async () => {
    const a = await createAchievement({ ...base, organisation: 'Old Club', result: '1st' })
    await applyChangeBatch([
      { achievementId: a.id, field: 'organisation', old: 'Old Club', new: 'Middlesex Magic' },
      { achievementId: a.id, field: 'result', old: '1st', new: 'Finalist' },
    ])
    expect((await db.achievements.get(a.id))?.organisation).toBe('Middlesex Magic')

    const { reverted } = await undoLastBatch()
    expect(reverted).toBe(2)
    const row = await db.achievements.get(a.id)
    expect(row?.organisation).toBe('Old Club')
    expect(row?.result).toBe('1st')
    // The undo is spent: undoing again does nothing.
    expect((await undoLastBatch()).reverted).toBe(0)
  })

  it('a newer confirmed change replaces the old undo, so only the newer is undone', async () => {
    const a = await createAchievement({ ...base, organisation: 'Old Club' })
    await applyChangeBatch([{ achievementId: a.id, field: 'organisation', old: 'Old Club', new: 'First club' }])
    // The second confirmed change supersedes the first.
    await applyChangeBatch([{ achievementId: a.id, field: 'result', old: '', new: 'New result' }])

    await undoLastBatch()
    const row = await db.achievements.get(a.id)
    expect(row?.result).toBe('') // the newer one is undone
    expect(row?.organisation).toBe('First club') // the older one stays
  })

  it('reports nothing to undo when there has been no confirmed change', async () => {
    expect(await getUndoInfo()).toBeUndefined()
    expect((await undoLastBatch()).reverted).toBe(0)
  })
})