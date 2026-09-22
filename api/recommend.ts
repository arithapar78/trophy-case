// POST /api/recommend
// Suggests three next achievements for the goal. Text only, never photos.
// Needs a sign-in and a use to spare (see server/aiRoute.ts). Stores nothing.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { runAiRoute } from '../server/aiRoute.js'
import { recommendNext } from '../server/goalAdvice.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await runAiRoute(req, res, (body, apiKey) => recommendNext(body, { apiKey }))
}
