// The one database connection. Dexie wraps the browser's IndexedDB, which is
// the phone's own storage: nothing here ever leaves the device.
//
// Never create another Dexie instance elsewhere. Import `db` from here.

import Dexie, { type EntityTable } from 'dexie'
import type { Achievement, Photo } from './types'

export class TrophyCaseDB extends Dexie {
  achievements!: EntityTable<Achievement, 'id'>
  photos!: EntityTable<Photo, 'id'>

  constructor(name = 'trophy-case') {
    super(name)
    // Only the fields we search or sort by are indexed. The rest are still
    // stored, just not indexed.
    this.version(1).stores({
      achievements: 'id, date, category, createdAt',
      photos: 'id, achievementId, [achievementId+order]',
    })
  }
}

export const db = new TrophyCaseDB()
