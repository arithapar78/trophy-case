// POST /api/auth/dev  { email }
// Test-mode sign-in for local development and tests, when there is no
// Google client id. Refused on the live site, always.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { signIn } from '../../server/auth.js'
import { readJsonBody, sendJson } from '../../server/http.js'
import { getStore } from '../../server/storeInstance.js'
import { devLoginAllowed } from '../config.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  if (!devLoginAllowed()) {
    sendJson(res, 403, { ok: false, message: 'Test-mode sign-in is off here.' })
    return
  }
  const body = (await readJsonBody(req)) as { email?: string } | undefined
  const email = body?.email?.trim()
  if (!email || !email.includes('@')) {
    sendJson(res, 400, { ok: false, message: 'Type an email address.' })
    return
  }
  const { token, user } = await signIn(getStore(), email)
  sendJson(res, 200, { ok: true, token, user: { email: user.email, plan: user.plan } })
}
