// POST /api/rank
// Ranks the achievements against the goal. Text only, never photos.
// Holds the key, stores nothing. See server/goalAdvice.ts.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJsonBody, sendJson } from '../server/http.js'
import { rankAchievements } from '../server/goalAdvice.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const body = await readJsonBody(req)
  const result = await rankAchievements(body, { apiKey: process.env.ANTHROPIC_API_KEY || undefined })
  sendJson(res, result.ok ? 200 : 400, result)
}
