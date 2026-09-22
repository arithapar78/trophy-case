// POST /api/read-photo
// The AI photo read. Needs a sign-in and a use to spare (see server/aiRoute.ts).
// Holds the API key (from the ANTHROPIC_API_KEY environment variable), passes
// the photo to the model, and returns a draft. It stores nothing.
//
// Imports here and in server/ spell out the ".js" extension on purpose:
// Vercel runs this file as a plain Node module, and Node needs the full
// file name. Locally the build tool would fill it in, Vercel does not.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { runAiRoute } from '../server/aiRoute.js'
import { readPhoto } from '../server/photoRead.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await runAiRoute(req, res, (body, apiKey) => readPhoto(body, { apiKey }))
}
