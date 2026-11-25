// Phase 15: the actions behind Settings, Family. The list itself lives in
// family.ts; this file also touches the databases, so it is kept apart
// (family.ts is read before any database opens).

import { openProfileDatabase } from './db'
import { addChild, forgetChild, MAIN_PROFILE_ID, setCurrentProfile, type ChildProfile } from './family'
import { WHATS_NEW } from './welcome'

// Adds the child and sets up their empty case: their name for the greeting
// and the export, and the welcome card marked as seen (it is written for
// the person holding the phone, not for a 7-year-old's case).
export async function createChildProfile(name: string, birthYear: number, birthMonth: number): Promise<ChildProfile> {
  const child = addChild(name, birthYear, birthMonth)
  const childDb = openProfileDatabase(child.id)
  try {
    await childDb.settings.bulkPut([
      { key: 'name', value: child.name },
      { key: 'whatsNewSeen', value: WHATS_NEW.id },
    ])
  } finally {
    childDb.close()
  }
  return child
}

export async function countAchievementsIn(profileId: string): Promise<number> {
  const profileDb = openProfileDatabase(profileId)
  try {
    return await profileDb.achievements.count()
  } finally {
    profileDb.close()
  }
}

// Deletes the child's whole database from the phone, then forgets them.
export async function removeChildProfile(profileId: string): Promise<void> {
  if (profileId === MAIN_PROFILE_ID) throw new Error('The original profile cannot be removed.')
  const profileDb = openProfileDatabase(profileId)
  await profileDb.delete()
  forgetChild(profileId)
}

// Opening another profile reloads the app, so every screen starts fresh
// against the right database. Simpler and safer than swapping it live.
export function switchToProfile(profileId: string): void {
  setCurrentProfile(profileId)
  window.location.reload()
}

// The original profile's name (from the hello card), read from its own
// database so it shows correctly while a child's case is open.
export async function mainProfileName(): Promise<string> {
  const mainDb = openProfileDatabase(MAIN_PROFILE_ID)
  try {
    const row = await mainDb.settings.get('name')
    return typeof row?.value === 'string' ? row.value : ''
  } finally {
    mainDb.close()
  }
}
