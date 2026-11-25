// Phase 14 tests: monthly AI credits, the cheaper model, and the route
// charging credits only for answers that actually came back.

import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it } from 'vitest'
import { signIn } from '../../server/auth'
import { runAiRoute } from '../../server/aiRoute'
import { getCreditsFor, spendCredits } from '../../server/credits'
import { AI_MODEL } from '../../server/model'
import { memoryStore, type Store } from '../../server/store'
import { CREDIT_COST, CREDITS_PER_MONTH, creditStatus, formatResetDay, isLow, monthKey, nextResetAt, outOfCreditsMessage } from '../../src/lib/credits'

let store: Store
beforeEach(() => {
  store = memoryStore()
})

function fakeRequest(token: string): IncomingMessage {
  const req = Readable.from([JSON.stringify({})]) as unknown as IncomingMessage
  req.method = 'POST'
  req.headers = { authorization: `Bearer ${token}` }
  return req
}
type Sent = { status: number; body: Record<string, unknown> }
function fakeResponse(): ServerResponse & { sent: Sent } {
  const res = {
    statusCode: 200,
    setHeader() {},
    end(text: string) {
      res.sent = { status: res.statusCode, body: JSON.parse(text) }
    },
    sent: { status: 0, body: {} } as Sent,
  }
  return res as unknown as ServerResponse & { sent: Sent }
}
const ok = async () => ({ ok: true as const, mock: true })
const fail = async () => ({ ok: false as const, message: 'nope' })

const nov15 = Date.UTC(2026, 10, 15, 12)
const dec1 = Date.UTC(2026, 11, 1)

describe('T14.1 the numbers', () => {
  it('months are UTC and reset at midnight on the 1st', () => {
    expect(monthKey(nov15)).toBe('2026-11')
    expect(nextResetAt(nov15)).toBe(dec1)
    expect(nextResetAt(Date.UTC(2026, 11, 31, 23))).toBe(Date.UTC(2027, 0, 1))
    expect(formatResetDay(dec1)).toBe('Dec 1')
  })

  it('free gets 50, pro 500, a summary costs 3 and everything else 1', () => {
    expect(CREDITS_PER_MONTH).toEqual({ free: 50, pro: 500 })
    expect(CREDIT_COST).toEqual({ photo: 1, scout: 1, rank: 1, recommend: 1, summary: 3 })
  })

  it('is "low" only at 20% or less', () => {
    expect(isLow(creditStatus(39, 50))).toBe(false)
    expect(isLow(creditStatus(40, 50))).toBe(true)
    expect(isLow(creditStatus(60, 50))).toBe(true)
    expect(creditStatus(60, 50).remaining).toBe(0)
  })

  it('says when they refill and never asks for money', () => {
    const empty = outOfCreditsMessage(creditStatus(50, 50, nov15), 1)
    expect(empty).toContain('Dec 1')
    expect(empty).not.toMatch(/upgrade|pay|pro/i)
    expect(outOfCreditsMessage(creditStatus(49, 50, nov15), 3)).toContain('needs 3')
  })

  it('uses the cheaper model everywhere', () => {
    expect(AI_MODEL).toBe('claude-haiku-5-5')
  })
})

describe('T14.2 counting on the server', () => {
  it('counts per month and per user, and a new month starts at zero', async () => {
    const { user } = await signIn(store, 'a@example.com')
    const { user: other } = await signIn(store, 'b@example.com')
    await spendCredits(store, user, 3, nov15)
    expect(await getCreditsFor(store, user, nov15)).toMatchObject({ used: 3, limit: 50, remaining: 47, resetsAt: dec1 })
    expect(await getCreditsFor(store, other, nov15)).toMatchObject({ used: 0 })
    expect(await getCreditsFor(store, user, dec1)).toMatchObject({ used: 0, remaining: 50 })
  })

  it('the route charges the action cost only when the AI answered', async () => {
    const { token, user } = await signIn(store, 'a@example.com')
    let res = fakeResponse()
    await runAiRoute(fakeRequest(token), res, 'summary', ok, { store, now: () => nov15 })
    expect(res.sent.status).toBe(200)
    expect(res.sent.body.credits).toMatchObject({ used: 3, remaining: 47 })

    res = fakeResponse()
    await runAiRoute(fakeRequest(token), res, 'scout', fail, { store, now: () => nov15 })
    expect(res.sent.status).toBe(400)
    expect(await getCreditsFor(store, user, nov15)).toMatchObject({ used: 3 })
  })

  it('refuses without running the AI when there are not enough credits', async () => {
    const { token, user } = await signIn(store, 'a@example.com')
    await spendCredits(store, user, 48, nov15)
    let ran = false
    const res = fakeResponse()
    await runAiRoute(fakeRequest(token), res, 'summary', async () => {
      ran = true
      return { ok: true as const, mock: true }
    }, { store, now: () => nov15 })
    expect(ran).toBe(false)
    expect(res.sent.status).toBe(429)
    expect(res.sent.body.code).toBe('credits')
    expect(String(res.sent.body.message)).toContain('Dec 1')
    // A cheaper action still fits.
    const res2 = fakeResponse()
    await runAiRoute(fakeRequest(token), res2, 'scout', ok, { store, now: () => nov15 })
    expect(res2.sent.status).toBe(200)
    // Nothing used up the 5-hour ceiling for the refused one.
    expect((await store.readUsage(user.id)).length).toBe(1)
  })

  it('a pro account gets 500', async () => {
    const { user } = await signIn(store, 'a@example.com')
    await store.putUser({ ...user, plan: 'pro' })
    expect(await getCreditsFor(store, { ...user, plan: 'pro' }, nov15)).toMatchObject({ limit: 500 })
  })

  it('deleting the account removes its credit count', async () => {
    const { user } = await signIn(store, 'a@example.com')
    await spendCredits(store, user, 5, nov15)
    await store.deleteUser(user.id)
    expect(await store.readCredits(user.id, '2026-11')).toBe(0)
  })
})
