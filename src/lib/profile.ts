// The Me tab: every achievement on one page, grouped by category, and the
// AI's "who you are" summary. The summary is written only when asked, kept
// on the device, and marked when the achievements have changed since.

import { AiUnavailableError, postAi } from './aiClient'
import type { AchievementSummary, ProfileSummary, Strength, SummaryResponse } from './aiTypes'
import { db } from './db'
import type { Achievement } from './types'

export interface SavedSummary extends ProfileSummary {
  writtenAt: number
  goal: string
  // The achievements it was written from, so the app can say what changed.
  achievementIds: string[]
  mock: boolean
}

const KEY = 'profileSummary'

function isStrength(value: unknown): value is Strength {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<Strength>
  return typeof s.name === 'string' && typeof s.why === 'string' && Array.isArray(s.achievementIds)
}

function isSavedSummary(value: unknown): value is SavedSummary {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<SavedSummary>
  return (
    typeof s.text === 'string' &&
    Array.isArray(s.strengths) &&
    s.strengths.every(isStrength) &&
    typeof s.writtenAt === 'number' &&
    typeof s.goal === 'string' &&
    Array.isArray(s.achievementIds)
  )
}

export async function getSavedSummary(): Promise<SavedSummary | undefined> {
  const row = await db.settings.get(KEY)
  return isSavedSummary(row?.value) ? row.value : undefined
}

export async function saveSummary(summary: SavedSummary): Promise<void> {
  await db.settings.put({ key: KEY, value: summary })
}

function summarise(achievements: Achievement[]): AchievementSummary[] {
  return achievements.map(({ id, title, category, date, note, organisation, role, result }) => ({
    id, title, category, date, note, organisation, role, result,
  }))
}

// One AI use. Words only, never photos. Saves the result on the device.
export async function writeSummaryWithAi(goal: string, achievements: Achievement[], now = Date.now()): Promise<SavedSummary> {
  const result = await postAi<SummaryResponse>('/api/summary', { goal, achievements: summarise(achievements) })
  if (!result.ok) throw new AiUnavailableError(result.message)
  const saved: SavedSummary = {
    ...result.summary,
    writtenAt: now,
    goal,
    achievementIds: achievements.map((a) => a.id),
    mock: result.mock,
  }
  await saveSummary(saved)
  return saved
}

export interface SummaryChanges {
  added: number
  changed: number
  removed: number
  goalChanged: boolean
}

// What has happened since the summary was written. Anything non-zero means
// it is worth offering a refresh.
export function changesSince(saved: SavedSummary, achievements: Achievement[], goal: string): SummaryChanges {
  const then = new Set(saved.achievementIds)
  const now = new Set(achievements.map((a) => a.id))
  let added = 0
  let changed = 0
  for (const a of achievements) {
    if (!then.has(a.id)) added += 1
    else if (a.updatedAt > saved.writtenAt) changed += 1
  }
  const removed = saved.achievementIds.filter((id) => !now.has(id)).length
  return { added, changed, removed, goalChanged: saved.goal.trim() !== goal.trim() }
}

export function hasChanges(c: SummaryChanges): boolean {
  return c.added + c.changed + c.removed > 0 || c.goalChanged
}

// "2 added and 1 changed since." in plain words, or '' if nothing changed.
export function describeChanges(c: SummaryChanges): string {
  const parts = [
    c.added && `${c.added} added`,
    c.changed && `${c.changed} changed`,
    c.removed && `${c.removed} removed`,
  ].filter(Boolean) as string[]
  const achievementsPart = parts.length ? `${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')} since` : ''
  const goalPart = c.goalChanged ? 'your goal changed' : ''
  if (!achievementsPart && !goalPart) return ''
  const sentence = [achievementsPart, goalPart].filter(Boolean).join(', and ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

export interface CategoryGroup<T> {
  category: string
  items: T[]
}

// Groups in the user's category order, newest first inside each group.
// Empty categories are left out. A category not on the list (which should
// not happen) goes at the end rather than disappearing.
export function groupByCategory<T extends { achievement: Achievement }>(rows: T[], categoryOrder: string[]): CategoryGroup<T>[] {
  const byCategory = new Map<string, T[]>()
  for (const row of rows) {
    const list = byCategory.get(row.achievement.category) ?? []
    list.push(row)
    byCategory.set(row.achievement.category, list)
  }
  const order = [...categoryOrder, ...[...byCategory.keys()].filter((c) => !categoryOrder.includes(c))]
  return order
    .filter((c) => byCategory.has(c))
    .map((category) => ({
      category,
      items: byCategory.get(category)!.sort((a, b) =>
        a.achievement.date !== b.achievement.date
          ? a.achievement.date < b.achievement.date ? 1 : -1
          : b.achievement.createdAt - a.achievement.createdAt,
      ),
    }))
}

export interface ProfileTotals {
  achievements: number
  categories: number
  firstYear?: number
  lastYear?: number
}

export function profileTotals(achievements: Achievement[]): ProfileTotals {
  if (achievements.length === 0) return { achievements: 0, categories: 0 }
  const years = achievements.map((a) => Number(a.date.slice(0, 4)))
  return {
    achievements: achievements.length,
    categories: new Set(achievements.map((a) => a.category)).size,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  }
}

// "2024 to 2026", or just "2026".
export function yearSpan(totals: ProfileTotals): string {
  if (totals.firstYear === undefined || totals.lastYear === undefined) return ''
  return totals.firstYear === totals.lastYear ? String(totals.lastYear) : `${totals.firstYear} to ${totals.lastYear}`
}

export interface CategoryBar {
  category: string
  count: number
  fraction: number // of the biggest, 0 to 1, for drawing the bar
}

// The biggest categories for the chart, most first. The rest are folded
// into one "N more" bar so the card never overflows.
export function categoryBars(achievements: Achievement[], max = 6): CategoryBar[] {
  const counts = new Map<string, number>()
  for (const a of achievements) counts.set(a.category, (counts.get(a.category) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  let shown = sorted
  if (sorted.length > max) {
    const rest = sorted.slice(max - 1)
    shown = [...sorted.slice(0, max - 1), [`${rest.length} more`, rest.reduce((sum, [, n]) => sum + n, 0)]]
  }
  const biggest = Math.max(1, ...shown.map(([, n]) => n))
  return shown.map(([category, count]) => ({ category, count, fraction: count / biggest }))
}
