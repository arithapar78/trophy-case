// The one database connection. Dexie wraps the browser's IndexedDB, which is
// the phone's own storage: nothing here ever leaves the device.
//
// Never create another Dexie instance elsewhere. Import `db` from here.

import Dexie, { type EntityTable } from 'dexie'
import { STARTER_CATEGORIES, type Achievement, type Photo, type Ranking, type ScoutMessage, type Setting } from './types'
import { cleanCustomCategories } from './validation'

export class TrophyCaseDB extends Dexie {
  achievements!: EntityTable<Achievement, 'id'>
  photos!: EntityTable<Photo, 'id'>
  rankings!: EntityTable<Ranking, 'achievementId'>
  settings!: EntityTable<Setting, 'key'>
  scoutMessages!: EntityTable<ScoutMessage, 'id'>

  constructor(name = 'trophy-case') {
    super(name)
    // Only the fields we search or sort by are indexed. The rest are still
    // stored, just not indexed.
    this.version(1).stores({
      achievements: 'id, date, category, createdAt',
      photos: 'id, achievementId, [achievementId+order]',
    })
    // Version 2 (Phase 4) adds the goal, rankings and recommendations.
    // Dexie upgrades an existing phone's database in place; nothing is lost.
    this.version(2).stores({
      achievements: 'id, date, category, createdAt',
      photos: 'id, achievementId, [achievementId+order]',
      rankings: 'achievementId',
      settings: 'key',
    })
    // Version 3 (Phase 7) adds the Scout conversation. Indexed by `at` so it
    // reads back oldest first without sorting the whole table.
    this.version(3).stores({
      achievements: 'id, date, category, createdAt',
      photos: 'id, achievementId, [achievementId+order]',
      rankings: 'achievementId',
      settings: 'key',
      scoutMessages: 'id, at',
    })
    // Version 4 (Phase 9) keeps the same tables. The categories changed from
    // a fixed list to a starter list plus the user's own, so any category
    // already in use that is not on the new starter list (Debate, Cooking)
    // becomes one of the user's own. No achievement changes category.
    this.version(4)
      .stores({
        achievements: 'id, date, category, createdAt',
        photos: 'id, achievementId, [achievementId+order]',
        rankings: 'achievementId',
        settings: 'key',
        scoutMessages: 'id, at',
      })
      .upgrade(async (tx) => {
        const starters = new Set<string>(STARTER_CATEGORIES)
        const inUse = new Set<string>()
        await tx.table('achievements').each((a: Achievement) => {
          if (!starters.has(a.category)) inUse.add(a.category)
        })
        const custom = cleanCustomCategories([...inUse].sort())
        if (custom.length > 0) await tx.table('settings').put({ key: 'customCategories', value: custom })
      })
  }
}

export const db = new TrophyCaseDB()
