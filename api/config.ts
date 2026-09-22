// GET /api/config
// What the app needs to know about this server before signing in: the
// Google client id (public, not a secret), whether test-mode sign-in is on,
// and whether accounts are set up at all. No secrets ever come through here.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../server/http.js'
import { accountsReady, isProduction } from '../server/storeInstance.js'

export function devLoginAllowed(): boolean {
  return !process.env.GOOGLE_CLIENT_ID && !isProduction()
}

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  sendJson(res, 200, {
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    devLogin: devLoginAllowed(),
    accountsReady: accountsReady(),
  })
}
