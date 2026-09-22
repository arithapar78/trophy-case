// The one database connection. Dexie wraps the browser's IndexedDB, which is
// the phone's own storage: nothing here ever leaves the device.
//
// Never create another Dexie instance elsewhere. Import `db` from here.

import Dexie, { type EntityTable } from 'dexie'
import type { Achievement, Photo, Ranking, ScoutMessage, Setting } from './types'

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
  }
}

export const db = new TrophyCaseDB()
