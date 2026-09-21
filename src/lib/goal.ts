// The goal, the rankings and the recommendations, stored on the device.
// The AI calls themselves live in goalClient.ts; this file is just storage.

import { db } from './db'
import { MAX_GOAL_LENGTH, type Achievement, type Ranking, type RecommendationSet } from './types'

export async function getGoal(): Promise<string> {
  const row = await db.settings.get('goal')
  return typeof row?.value === 'string' ? row.value : ''
}

export async function setGoal(goal: string): Promise<string> {
  const cleaned = goal.trim().slice(0, MAX_GOAL_LENGTH)
  await db.settings.put({ key: 'goal', value: cleaned })
  return cleaned
}

export async function getRankings(): Promise<Map<string, Ranking>> {
  const rows = await db.rankings.toArray()
  return new Map(rows.map((r) => [r.achievementId, r]))
}

// Replaces every ranking. Achievements not in the list are left unranked.
export async function saveRankings(rankings: Ranking[]): Promise<void> {
  await db.transaction('rw', db.rankings, async () => {
    await db.rankings.clear()
    await db.rankings.bulkPut(rankings)
  })
}

export async function getRecommendations(): Promise<RecommendationSet | undefined> {
  const row = await db.settings.get('recommendations')
  const value = row?.value as Partial<RecommendationSet> | undefined
  if (!value || !Array.isArray(value.items)) return undefined
  return { goal: value.goal ?? '', items: value.items, createdAt: value.createdAt ?? 0 }
}

export async function setRecommendations(set: RecommendationSet): Promise<void> {
  await db.settings.put({ key: 'recommendations', value: set })
}

export interface RankedRow {
  achievement: Achievement
  ranking?: Ranking
}

// Ranked first (1, 2, 3...), then the unranked ones newest first.
export function orderByRank(achievements: Achievement[], rankings: Map<string, Ranking>): RankedRow[] {
  const rows = achievements.map((achievement) => ({ achievement, ranking: rankings.get(achievement.id) }))
  return rows.sort((a, b) => {
    if (a.ranking && b.ranking) return a.ranking.rank - b.ranking.rank
    if (a.ranking) return -1
    if (b.ranking) return 1
    return 0 // keep the newest-first order they came in
  })
}
