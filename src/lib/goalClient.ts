// The phone's side of ranking and recommendations: send the goal and the
// achievements' text to the functions, get answers back. Never photos.

import type { AchievementSummary, GoalRequest, RankResponse, RecommendResponse } from './aiTypes'
import { AiUnavailableError } from './aiClient'
import type { Achievement, Ranking, Recommendation } from './types'

function summarise(achievements: Achievement[]): AchievementSummary[] {
  return achievements.map(({ id, title, category, date, note, organisation, role, result }) => ({
    id, title, category, date, note, organisation, role, result,
  }))
}

async function post<T extends { ok: boolean }>(path: string, body: GoalRequest): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new AiUnavailableError("Couldn't reach the AI. Check your signal and try again.")
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new AiUnavailableError("The AI didn't answer properly. Try again in a minute.")
  }
}

export async function rankWithAi(goal: string, achievements: Achievement[]): Promise<{ rankings: Ranking[]; mock: boolean }> {
  const result = await post<RankResponse>('/api/rank', { goal, achievements: summarise(achievements) })
  if (!result.ok) throw new AiUnavailableError(result.message)
  const rankedAt = Date.now()
  return { mock: result.mock, rankings: result.ranks.map((r) => ({ achievementId: r.id, rank: r.rank, reason: r.reason, rankedAt })) }
}

export async function recommendWithAi(goal: string, achievements: Achievement[]): Promise<{ items: Recommendation[]; mock: boolean }> {
  const result = await post<RecommendResponse>('/api/recommend', { goal, achievements: summarise(achievements) })
  if (!result.ok) throw new AiUnavailableError(result.message)
  return { mock: result.mock, items: result.suggestions }
}
