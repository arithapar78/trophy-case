// POST /api/auth/google
// Google's sign-in page posts a form here with the signed ID token. We check
// it, create a session, and send the browser back to the app with the token
// in the address, which the app reads and then removes. Also accepts JSON
// ({ credential }) for the popup flow, answering with JSON instead.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { signIn, verifyGoogleIdToken } from '../../server/auth.js'
import { readCookie, readFormBody, readJsonBody, redirect, sendJson } from '../../server/http.js'
import { accountsReady, getStore } from '../../server/storeInstance.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId || !accountsReady()) {
    sendJson(res, 503, { ok: false, message: "Sign-in isn't set up on the server yet." })
    return
  }

  const isJson = (req.headers['content-type'] ?? '').includes('application/json')
  let credential: string | undefined
  if (isJson) {
    const body = (await readJsonBody(req)) as { credential?: string } | undefined
    credential = body?.credential
  } else {
    const form = await readFormBody(req)
    // Google's double-submit check against forged posts.
    if (!form.g_csrf_token || form.g_csrf_token !== readCookie(req, 'g_csrf_token')) {
      sendJson(res, 400, { ok: false, message: 'That sign-in request was not from Google. Try again.' })
      return
    }
    credential = form.credential
  }
  if (!credential) {
    sendJson(res, 400, { ok: false, message: 'No sign-in token was sent.' })
    return
  }

  const email = await verifyGoogleIdToken(credential, clientId)
  if (!email) {
    sendJson(res, 401, { ok: false, message: "Google didn't confirm that sign-in. Try again." })
    return
  }

  const { token, user } = await signIn(getStore(), email)
  if (isJson) {
    sendJson(res, 200, { ok: true, token, user: { email: user.email, plan: user.plan } })
  } else {
    redirect(res, `/?session=${encodeURIComponent(token)}`)
  }
}
