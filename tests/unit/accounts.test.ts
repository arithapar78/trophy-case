// Phase 5 tests: the account store, signing in, the server-side limit, and
// the guard every AI function goes through. All of it runs against the
// in-memory store, so no Redis and no network.

import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { authenticate, signIn, verifyGoogleIdToken, type FetchLike } from '../../server/auth'
import { memoryStore, type Store } from '../../server/store'
import { getUsageFor, USES_PER_WINDOW, useOne } from '../../server/usage'
import { runAiRoute } from '../../server/aiRoute'
import { WINDOW_MS } from '../../src/lib/aiUsage'

let store: Store

beforeEach(() => {
  store = memoryStore()
})

// A stand-in for a real request: a POST with a JSON body and, optionally,
// a sign-in token.
function fakeRequest(token?: string, body: unknown = { hello: 'world' }): IncomingMessage {
  const req = Readable.from([JSON.stringify(body)]) as unknown as IncomingMessage
  req.method = 'POST'
  req.headers = token ? { authorization: `Bearer ${token}` } : {}
  return req
}

interface FakeResponse extends ServerResponse {
  sent: { status: number; body: Record<string, unknown> }
}

function fakeResponse(): FakeResponse {
  const res = {
    statusCode: 200,
    setHeader() {},
    end(text: string) {
      res.sent = { status: res.statusCode, body: JSON.parse(text) }
    },
    sent: { status: 0, body: {} },
  }
  return res as unknown as FakeResponse
}

describe('T5.1 sessions', () => {
  it('a valid token returns the user, an unknown one does not', async () => {
    const { token, user } = await signIn(store, 'Ari@Example.com ')
    expect(user.email).toBe('ari@example.com')
    expect(user.plan).toBe('free')

    expect(await authenticate(store, fakeRequest(token))).toMatchObject({ id: user.id })
    expect(await authenticate(store, fakeRequest('not-a-real-token'))).toBeUndefined()
    expect(await authenticate(store, fakeRequest())).toBeUndefined()
  })

  it('signing in twice with the same email keeps one account', async () => {
    const first = await signIn(store, 'ari@example.com')
    const second = await signIn(store, 'ARI@example.com')
    expect(second.user.id).toBe(first.user.id)
    expect(second.token).not.toBe(first.token)
    // Both sessions still work.
    expect(await authenticate(store, fakeRequest(first.token))).toBeDefined()
    expect(await authenticate(store, fakeRequest(second.token))).toBeDefined()
  })

  it('a deleted session is refused', async () => {
    const { token } = await signIn(store, 'ari@example.com')
    await store.deleteSession(token)
    expect(await authenticate(store, fakeRequest(token))).toBeUndefined()
  })

  it('a Google id token is accepted only for this app and a verified email', async () => {
    const answer = (info: unknown): FetchLike => async () => ({ ok: true, json: async () => info })

    expect(await verifyGoogleIdToken('x', 'my-app', answer({ aud: 'my-app', email: 'ari@example.com', email_verified: 'true' })))
      .toBe('ari@example.com')
    // Issued for a different app.
    expect(await verifyGoogleIdToken('x', 'my-app', answer({ aud: 'someone-else', email: 'ari@example.com', email_verified: 'true' })))
      .toBeUndefined()
    // Email not verified by Google.
    expect(await verifyGoogleIdToken('x', 'my-app', answer({ aud: 'my-app', email: 'ari@example.com', email_verified: 'false' })))
      .toBeUndefined()
    // Google refused the token outright.
    expect(await verifyGoogleIdToken('x', 'my-app', async () => ({ ok: false, json: async () => ({}) }))).toBeUndefined()
  })
})

describe('T5.2 the limit', () => {
  it('allows exactly the ceiling on Free and refuses the next one', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const now = Date.now()
    for (let i = 0; i < USES_PER_WINDOW.free; i++) {
      expect((await useOne(store, user, now)).ok).toBe(true)
    }
    const over = await useOne(store, user, now)
    expect(over.ok).toBe(false)
    expect(over.usage.remaining).toBe(0)
    expect(over.usage.nextFreeAt).toBe(now + WINDOW_MS)
  })

  it('allows exactly the ceiling on Pro', async () => {
    const { user } = await signIn(store, 'pro@example.com')
    const pro = { ...user, plan: 'pro' as const }
    await store.putUser(pro)
    const now = Date.now()
    for (let i = 0; i < USES_PER_WINDOW.pro; i++) {
      expect((await useOne(store, pro, now)).ok).toBe(true)
    }
    expect((await useOne(store, pro, now)).ok).toBe(false)
  })

  it('frees a slot 5 hours later', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const start = Date.now()
    for (let i = 0; i < USES_PER_WINDOW.free; i++) await useOne(store, user, start)
    expect((await useOne(store, user, start + WINDOW_MS - 1000)).ok).toBe(false)
    expect((await useOne(store, user, start + WINDOW_MS + 1000)).ok).toBe(true)
  })

  it('reports what is left without spending a use', async () => {
    const { user } = await signIn(store, 'ari@example.com')
    const now = Date.now()
    await useOne(store, user, now)
    const limit = USES_PER_WINDOW.free
    expect(await getUsageFor(store, user, now)).toMatchObject({ used: 1, limit, remaining: limit - 1 })
    // Asking twice does not spend anything.
    expect(await getUsageFor(store, user, now)).toMatchObject({ used: 1, remaining: limit - 1 })
  })
})

describe('T5.3 the AI route guard', () => {
  const work = async () => ({ ok: true as const, mock: true, draft: 'something' })

  it('refuses a request with no token and never runs the work', async () => {
    let ran = false
    const res = fakeResponse()
    await runAiRoute(fakeRequest(), res, async () => {
      ran = true
      return { ok: true as const, mock: true }
    }, { store })
    expect(res.sent.status).toBe(401)
    expect(res.sent.body.code).toBe('signin')
    expect(ran).toBe(false)
  })

  it('counts one use on success and attaches the numbers left', async () => {
    const { token } = await signIn(store, 'ari@example.com')
    const res = fakeResponse()
    await runAiRoute(fakeRequest(token), res, work, { store })
    expect(res.sent.status).toBe(200)
    expect(res.sent.body.usage).toMatchObject({ used: 1, limit: USES_PER_WINDOW.free, remaining: USES_PER_WINDOW.free - 1 })
  })

  it('refuses at the limit, spends nothing, and says when the next one frees up', async () => {
    const { token, user } = await signIn(store, 'ari@example.com')
    const now = Date.now()
    for (let i = 0; i < USES_PER_WINDOW.free; i++) await useOne(store, user, now)

    let ran = false
    const res = fakeResponse()
    await runAiRoute(fakeRequest(token), res, async () => {
      ran = true
      return { ok: true as const, mock: true }
    }, { store, now: () => now })

    expect(ran).toBe(false)
    expect(res.sent.status).toBe(429)
    expect(res.sent.body.code).toBe('limit')
    expect(String(res.sent.body.message)).toContain('frees up in')
    // Still exactly at the ceiling: the refused request did not count.
    expect(await getUsageFor(store, user, now)).toMatchObject({ used: USES_PER_WINDOW.free })
  })

  it('answers 405 to anything but POST', async () => {
    const req = fakeRequest()
    req.method = 'GET'
    const res = fakeResponse()
    await runAiRoute(req, res, work, { store })
    expect(res.sent.status).toBe(405)
  })
})

describe('T5.4 deleting an account', () => {
  it('removes the user, their sessions and their usage', async () => {
    const { token, user } = await signIn(store, 'ari@example.com')
    await useOne(store, user, Date.now())

    await store.deleteUser(user.id)

    expect(await store.getUser(user.id)).toBeUndefined()
    expect(await store.getUserByEmail('ari@example.com')).toBeUndefined()
    expect(await store.getSessionUserId(token)).toBeUndefined()
    expect(await store.readUsage(user.id)).toEqual([])
    expect(await authenticate(store, fakeRequest(token))).toBeUndefined()
  })
})

describe('test-mode sign-in is off wherever it matters', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('is on only with no Google client id and outside production', async () => {
    const { devLoginAllowed } = await import('../../api/config')

    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.VERCEL_ENV
    expect(devLoginAllowed()).toBe(true)

    process.env.VERCEL_ENV = 'production'
    expect(devLoginAllowed()).toBe(false)

    delete process.env.VERCEL_ENV
    process.env.GOOGLE_CLIENT_ID = 'something.apps.googleusercontent.com'
    expect(devLoginAllowed()).toBe(false)
  })
})
