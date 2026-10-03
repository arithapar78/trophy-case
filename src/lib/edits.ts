// Applying Scout's proposed edits (Phase 11) and undoing the last confirmed
// batch. This is where the rules live so they can be unit-tested without a
// browser:
//   - only the ticked changes are applied,
//   - a change is skipped when the achievement was edited since the
//     suggestion (the old value no longer matches), or the new value fails
//     the same validation the form uses,
//   - the undo restores exactly what changed, until the next confirmed change.

import type { EditField, ProposedChange } from './aiTypes'
import { getCategories } from './categories'
import { db } from './db'
import { todayISO } from './dates'
import type { AchievementInput } from './types'
import { validateAchievement } from './validation'

export interface AppliedChange {
  achievementId: string
  field: EditField
  old: string
  new: string
}

export interface ApplyReport {
  applied: AppliedChange[]
  // The changes that could not be applied, because the achievement had been
  // edited since (the old value no longer matched) or the new value failed
  // validation. The card counts them so the user is told (22.5, 22.6).
  skipped: number
}

// What a confirmed batch put back in place, enough to undo it exactly.
export interface EditUndo {
  applied: AppliedChange[]
  at: number
}

const UNDO_KEY = 'lastAppliedEdit'

// Takes an achievement and one field forced to `value`, as the form would
// see it, so validation has the full picture (a long change to one field
// still counts against that field alone).
function mergedInput(achievement: { title: string; date: string; category: string; note: string; organisation: string; role: string; result: string }, field: EditField, value: string): AchievementInput {
  return {
    title: field === 'title' ? value : achievement.title,
    date: achievement.date,
    category: field === 'category' ? value : achievement.category,
    note: field === 'note' ? value : achievement.note,
    organisation: field === 'organisation' ? value : achievement.organisation,
    role: field === 'role' ? value : achievement.role,
    result: field === 'result' ? value : achievement.result,
  }
}

export async function applyChangeBatch(changes: ProposedChange[]): Promise<ApplyReport> {
  const categories = await getCategories()
  const applied: AppliedChange[] = []
  let skipped = 0

  for (const change of changes) {
    const achievement = await db.achievements.get(change.achievementId)
    if (!achievement) {
      skipped += 1
      continue
    }
    // Edited since the suggestion (22.6): only apply when the stored value
    // still matches what Scout said was there.
    if (achievement[change.field] !== change.old) {
      skipped += 1
      continue
    }
    const checked = validateAchievement(mergedInput(achievement, change.field, change.new), 0, todayISO(), categories)
    if (!checked.ok) {
      skipped += 1
      continue
    }
    const patches: { updatedAt: number } & Partial<Record<EditField, string>> = { updatedAt: Date.now() }
    patches[change.field] = checked.value[change.field]
    await db.achievements.update(change.achievementId, patches)
    applied.push({ achievementId: change.achievementId, field: change.field, old: change.old, new: change.new })
  }

  // A new confirmed change replaces any earlier undo (22.3).
  if (applied.length > 0) {
    await db.settings.put({ key: UNDO_KEY, value: { applied, at: Date.now() } })
  }
  return { applied, skipped }
}

export async function getUndoInfo(): Promise<EditUndo | undefined> {
  const row = await db.settings.get(UNDO_KEY)
  return row?.value as EditUndo | undefined
}

// Reverts exactly what the last confirmed batch changed, and spends the undo.
export async function undoLastBatch(): Promise<{ reverted: number }> {
  const undo = await getUndoInfo()
  if (!undo) return { reverted: 0 }
  let reverted = 0
  for (const change of undo.applied) {
    const achievement = await db.achievements.get(change.achievementId)
    if (!achievement) continue
    const patches: Partial<Record<EditField, string>> = {}
    patches[change.field] = change.old
    await db.achievements.update(change.achievementId, patches)
    reverted += 1
  }
  await db.settings.delete(UNDO_KEY)
  return { reverted }
}