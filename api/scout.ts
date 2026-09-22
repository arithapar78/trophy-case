// POST /api/scout
// One message to Scout, the chat that knows the goal and the timeline.
// Needs a sign-in (see server/aiRoute.ts). Stores nothing: the conversation
// lives on the phone and travels up with each message.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { runAiRoute } from '../server/aiRoute.js'
import { askScout } from '../server/scout.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await runAiRoute(req, res, (body, apiKey) => askScout(body, { apiKey }))
}
