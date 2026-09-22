// The account on this device: the session token, who is signed in, and the
// latest AI usage numbers the server told us. Components read it through
// useAccount() and everything updates together.

import { useSyncExternalStore } from 'react'
import type { UsageStatus } from './aiUsage'

export interface AccountUser {
  email: string
  plan: 'free' | 'pro'
}

export interface AccountState {
  // undefined = not checked yet, null = signed out
  user: AccountUser | null | undefined
  usage?: UsageStatus
}

export interface ServerConfig {
  googleClientId: string | null
  devLogin: boolean
  accountsReady: boolean
}

const TOKEN_KEY = 'trophy-case.session'

let state: AccountState = { user: undefined }
const listeners = new Set<() => void>()

function emit(next: AccountState) {
  state = next
  for (const l of listeners) l()
}

export function getToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function setToken(token: string | undefined) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable: the sign-in just won't stick.
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// Called whenever an AI answer carries fresh usage numbers.
export function rememberUsage(usage: UsageStatus | undefined) {
  if (usage) emit({ ...state, usage })
}

export class AccountError extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } })
  } catch {
    throw new AccountError("Couldn't reach the server. Check your signal and try again.")
  }
  let body: { ok?: boolean; message?: string; code?: string } & T
  try {
    body = (await response.json()) as typeof body
  } catch {
    throw new AccountError("The server didn't answer properly. Try again in a minute.")
  }
  if (response.status === 401) {
    // The session is gone (signed out elsewhere, expired, or the server was reset).
    setToken(undefined)
    emit({ user: null })
  }
  if (!response.ok || body.ok === false) throw new AccountError(body.message ?? 'Something went wrong. Try again.')
  return body
}

export async function fetchConfig(): Promise<ServerConfig> {
  return call<ServerConfig>('/api/config')
}

// On start: if there is a token, ask the server who we are.
export async function refreshAccount(): Promise<void> {
  if (!getToken()) {
    emit({ user: null })
    return
  }
  try {
    const me = await call<{ user: AccountUser; usage: UsageStatus }>('/api/me')
    emit({ user: me.user, usage: me.usage })
  } catch (err) {
    // Signed out by the server: handled in call(). Anything else (no
    // signal) keeps the last known state so the app still opens offline.
    if (state.user === undefined) emit({ user: null })
    if (!(err instanceof AccountError)) throw err
  }
}

// After Google's redirect the token arrives in the address bar.
export function takeTokenFromUrl(): boolean {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('session')
  if (!token) return false
  setToken(token)
  url.searchParams.delete('session')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  return true
}

async function finishSignIn(result: { token: string; user: AccountUser }) {
  setToken(result.token)
  emit({ user: result.user })
  await refreshAccount()
}

export async function signInWithGoogleCredential(credential: string): Promise<void> {
  await finishSignIn(
    await call('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) }),
  )
}

export async function signInTestMode(email: string): Promise<void> {
  await finishSignIn(
    await call('/api/auth/dev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }),
  )
}

export async function signOut(): Promise<void> {
  try {
    await call('/api/auth/signout', { method: 'POST' })
  } catch {
    // Even if the server can't be reached, forget the token here.
  }
  setToken(undefined)
  emit({ user: null })
}

export async function deleteAccount(): Promise<void> {
  await call('/api/me', { method: 'DELETE' })
  setToken(undefined)
  emit({ user: null })
}
