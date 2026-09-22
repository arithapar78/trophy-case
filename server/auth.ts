// Signing in and checking who is asking. A session is a random token the
// app keeps on the device and sends with every AI request.

import { randomBytes, randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { normaliseEmail, type Store, type User } from './store.js'

export interface SignInResult {
  token: string
  user: User
}

export async function signIn(store: Store, email: string): Promise<SignInResult> {
  const cleaned = normaliseEmail(email)
  let user = await store.getUserByEmail(cleaned)
  if (!user) {
    user = { id: randomUUID(), email: cleaned, plan: 'free', createdAt: Date.now() }
    await store.putUser(user)
  }
  const token = randomBytes(32).toString('base64url')
  await store.createSession(user.id, token)
  return { token, user }
}

export function getBearerToken(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization
  if (!header) return undefined
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token : undefined
}

// The user behind a request, or undefined if not signed in.
export async function authenticate(store: Store, req: IncomingMessage): Promise<User | undefined> {
  const token = getBearerToken(req)
  if (!token) return undefined
  const userId = await store.getSessionUserId(token)
  if (!userId) return undefined
  return store.getUser(userId)
}

// Google hands the app a signed "ID token". Google's own endpoint checks
// the signature; we check it was issued for our app and the email is real.
export type FetchLike = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  fetchImpl: FetchLike = fetch,
): Promise<string | undefined> {
  const response = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  if (!response.ok) return undefined
  const info = (await response.json()) as { aud?: string; email?: string; email_verified?: string | boolean }
  if (info.aud !== clientId) return undefined
  if (info.email_verified !== 'true' && info.email_verified !== true) return undefined
  return typeof info.email === 'string' ? info.email : undefined
}
