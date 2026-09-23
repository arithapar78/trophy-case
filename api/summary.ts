// POST /api/summary
// The Me tab's "who you are" summary. Needs a sign-in (see server/aiRoute.ts).
// Text only, never photos. Stores nothing.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { runAiRoute } from '../server/aiRoute.js'
import { writeSummary } from '../server/summary.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await runAiRoute(req, res, (body, apiKey) => writeSummary(body, { apiKey }))
}
