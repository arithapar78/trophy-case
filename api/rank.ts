// POST /api/rank
// Ranks the achievements against the goal. Text only, never photos.
// Needs a sign-in and a use to spare (see server/aiRoute.ts). Stores nothing.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { runAiRoute } from '../server/aiRoute.js'
import { rankAchievements } from '../server/goalAdvice.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await runAiRoute(req, res, (body, apiKey) => rankAchievements(body, { apiKey }))
}
