// The phone's side of ranking and recommendations: send the goal and the
// achievements' text to the functions, get answers back. Never photos.

import { AiUnavailableError, postAi } from './aiClient'
import type { AchievementSummary, RankResponse, RecommendResponse } from './aiTypes'
import type { Achievement, Ranking, Recommendation } from './types'

function summarise(achievements: Achievement[]): AchievementSummary[] {
  return achievements.map(({ id, title, category, date, note, organisation, role, result }) => ({
    id, title, category, date, note, organisation, role, result,
  }))
}

export async function rankWithAi(goal: string, achievements: Achievement[]): Promise<{ rankings: Ranking[]; mock: boolean }> {
  const result = await postAi<RankResponse>('/api/rank', { goal, achievements: summarise(achievements) })
  if (!result.ok) throw new AiUnavailableError(result.message)
  const rankedAt = Date.now()
  return { mock: result.mock, rankings: result.ranks.map((r) => ({ achievementId: r.id, rank: r.rank, reason: r.reason, rankedAt })) }
}

export async function recommendWithAi(goal: string, achievements: Achievement[]): Promise<{ items: Recommendation[]; mock: boolean }> {
  const result = await postAi<RecommendResponse>('/api/recommend', { goal, achievements: summarise(achievements) })
  if (!result.ok) throw new AiUnavailableError(result.message)
  return { mock: result.mock, items: result.suggestions }
}
