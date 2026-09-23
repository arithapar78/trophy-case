// The three sign-in routes: Google, test mode, and sign out. They used to be
// three files in api/auth/, one serverless function each. Vercel's free plan
// allows at most 12 functions per deployment, and Phase 10 made 13, so the
// whole deployment was refused. Now api/auth/[action].ts is ONE function that
// reads the address and calls the right one of these. The addresses are
// unchanged: /api/auth/google, /api/auth/dev, /api/auth/signout.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { devLoginAllowed } from '../api/config.js'
import { getBearerToken, signIn, verifyGoogleIdToken } from './auth.js'
import { readCookie, readFormBody, readJsonBody, redirect, sendJson } from './http.js'
import { accountsReady, getStore } from './storeInstance.js'

// POST /api/auth/google
// Google's sign-in page posts a form here with the signed ID token. We check
// it, create a session, and send the browser back to the app with the token
// in the address, which the app reads and then removes. Also accepts JSON
// ({ credential }) for the popup flow, answering with JSON instead.
export async function googleSignIn(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

// POST /api/auth/dev  { email }
// Test-mode sign-in for local development and tests, when there is no
// Google client id. Refused on the live site, always.
export async function devSignIn(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

// POST /api/auth/signout
// Forgets this session on the server. The app forgets the token on the device.
export async function signOutRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const token = getBearerToken(req)
  if (token) await getStore().deleteSession(token)
  sendJson(res, 200, { ok: true })
}

type Route = (req: IncomingMessage, res: ServerResponse) => Promise<void>

export const AUTH_ROUTES: Record<string, Route> = {
  google: googleSignIn,
  dev: devSignIn,
  signout: signOutRoute,
}

// Which route an address means. Vercel may hand the function the address as
// it was typed (/api/auth/google) or rewritten with the name as a query
// (?action=google), so both are understood.
export function authActionFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const parsed = new URL(url, 'http://localhost')
  const fromQuery = parsed.searchParams.get('action')
  if (fromQuery) return fromQuery
  const last = parsed.pathname.split('/').filter(Boolean).pop()
  return last
}

export async function authDispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const action = authActionFromUrl(req.url)
  const route = action ? AUTH_ROUTES[action] : undefined
  if (!route) {
    sendJson(res, 404, { ok: false, message: 'No such sign-in route.' })
    return
  }
  await route(req, res)
}
