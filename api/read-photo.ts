// POST /api/read-photo
// The only piece of Trophy Case that runs on a server. It holds the API key
// (from the ANTHROPIC_API_KEY environment variable), passes the photo to the
// model, and returns a draft. It stores nothing. See server/photoRead.ts.
//
// Imports here and in server/ spell out the ".js" extension on purpose:
// Vercel runs this file as a plain Node module, and Node needs the full
// file name. Locally the build tool would fill it in, Vercel does not.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJsonBody, sendJson } from '../server/http.js'
import { readPhoto } from '../server/photoRead.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const body = await readJsonBody(req)
  const result = await readPhoto(body, { apiKey: process.env.ANTHROPIC_API_KEY || undefined })
  sendJson(res, result.ok ? 200 : 400, result)
}
