// Phase 15 tests: profiles on the phone, and a parent's permission on the
// server before AI is used for a child under 13.

import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it } from 'vitest'
import { signIn } from '../../server/auth'
import { runAiRoute } from '../../server/aiRoute'
import { applyConsentRequest, CONSENT_VERSION } from '../../server/consent'
import { memoryStore, type Store } from '../../server/store'
import { openProfileDatabase } from '../../src/lib/db'
import {
  addChild,
  checkNewChild,
  currentProfileId,
  databaseNameFor,
  isUnder13,
  isValidProfileId,
  listChildren,
  MAIN_PROFILE_ID,
  MAX_PROFILES,
  profileHeaders,
  setCurrentProfile,
} from '../../src/lib/family'
import { countAchievementsIn, createChildProfile, removeChildProfile } from '../../src/lib/household'

// The unit tests run in Node, which has no localStorage: a tiny stand-in.
const memory = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  length: 0,
} as Storage

const now = new Date(2026, 10, 25)

beforeEach(() => memory.clear())

describe('T15.1 profiles on the phone', () => {
  it('adds, validates and lists children; the original is the default', () => {
    expect(currentProfileId()).toBe(MAIN_PROFILE_ID)
    expect(checkNewChild('  ', 2018, 5, now)).toBe('name')
    expect(checkNewChild('Rohan', 2030, 5, now)).toBe('date')
    expect(checkNewChild('Rohan', 2018, 13, now)).toBe('date')
    const child = addChild('  Rohan  ', 2017, 3, now)
    expect(child.name).toBe('Rohan')
    expect(isValidProfileId(child.id)).toBe(true)
    expect(listChildren()).toEqual([child])
    expect(databaseNameFor(child.id)).toBe(`trophy-case-${child.id}`)
    expect(databaseNameFor(MAIN_PROFILE_ID)).toBe('trophy-case')
  })

  it('caps the number of profiles', () => {
    for (let i = 0; i < MAX_PROFILES - 1; i++) addChild(`Kid ${i}`, 2016, 1, now)
    expect(checkNewChild('One more', 2016, 1, now)).toBe('full')
  })

  it('under 13 uses the same month rule as the sign-in check', () => {
    expect(isUnder13({ birthYear: 2013, birthMonth: 12 }, now)).toBe(true)
    expect(isUnder13({ birthYear: 2013, birthMonth: 11 }, now)).toBe(false)
  })

  it('an unknown current id falls back to the original', () => {
    setCurrentProfile('doesnotexist00')
    expect(currentProfileId()).toBe(MAIN_PROFILE_ID)
  })

  it('sends only a random id and a yes/no, and nothing for the original', () => {
    expect(profileHeaders(now)).toEqual({})
    const child = addChild('Maya', 2018, 6, now)
    setCurrentProfile(child.id)
    expect(profileHeaders(now)).toEqual({ 'x-profile-id': child.id, 'x-profile-under-13': '1' })
    expect(JSON.stringify(profileHeaders(now))).not.toContain('Maya')
  })

  it('each child gets its own database; removing one deletes it', async () => {
    const child = await createChildProfile('Rohan', 2017, 3)
    const childDb = openProfileDatabase(child.id)
    expect(await childDb.settings.get('name')).toMatchObject({ value: 'Rohan' })
    await childDb.achievements.add({ id: 'a1', title: 'Spelling bee', date: '2026-05-01', category: 'School', note: '', organisation: '', role: '', result: '', createdAt: 1, updatedAt: 1 })
    childDb.close()
    expect(await countAchievementsIn(child.id)).toBe(1)
    // The original case is untouched.
    expect(await countAchievementsIn(MAIN_PROFILE_ID)).toBe(0)

    await removeChildProfile(child.id)
    expect(listChildren()).toEqual([])
    expect(await countAchievementsIn(child.id)).toBe(0)
    await expect(removeChildProfile(MAIN_PROFILE_ID)).rejects.toThrow()
  })
})

// --- server ---

let store: Store
function fakeRequest(token: string, headers: Record<string, string> = {}): IncomingMessage {
  const req = Readable.from([JSON.stringify({})]) as unknown as IncomingMessage
  req.method = 'POST'
  req.headers = { authorization: `Bearer ${token}`, ...headers }
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

describe('T15.2 a parent\'s permission on the server', () => {
  const kid = 'abcd1234efgh5678'
  const under13 = { 'x-profile-id': kid, 'x-profile-under-13': '1' }

  beforeEach(() => {
    store = memoryStore()
  })

  async function ask(token: string, headers: Record<string, string>) {
    let ran = false
    const res = fakeResponse()
    await runAiRoute(fakeRequest(token, headers), res, 'scout', async () => {
      ran = true
      return { ok: true as const, mock: true }
    }, { store })
    return { ran, res }
  }

  it('refuses an under-13 profile without permission, calls no AI and spends nothing', async () => {
    const { token, user } = await signIn(store, 'parent@example.com')
    const { ran, res } = await ask(token, under13)
    expect(ran).toBe(false)
    expect(res.sent.status).toBe(403)
    expect(res.sent.body.code).toBe('consent')
    expect(String(res.sent.body.message)).toContain('Settings, then Family')
    expect(await store.readUsage(user.id)).toEqual([])
  })

  it('permission lets it through; withdrawing stops it again', async () => {
    const { token, user } = await signIn(store, 'parent@example.com')
    expect(await applyConsentRequest(store, user, { action: 'consent', profileId: kid, isParentAndAdult: true, agrees: true }, 5)).toEqual({ ok: true })
    expect(await store.getConsent(user.id, kid)).toEqual({ at: 5, version: CONSENT_VERSION })
    expect((await ask(token, under13)).ran).toBe(true)

    await applyConsentRequest(store, user, { action: 'withdraw', profileId: kid })
    expect((await ask(token, under13)).res.sent.status).toBe(403)
  })

  it('needs both boxes ticked and a proper id', async () => {
    const { user } = await signIn(store, 'parent@example.com')
    expect((await applyConsentRequest(store, user, { action: 'consent', profileId: kid, isParentAndAdult: true })).ok).toBe(false)
    expect((await applyConsentRequest(store, user, { action: 'consent', profileId: 'Rohan!', isParentAndAdult: true, agrees: true })).ok).toBe(false)
    expect(await store.listConsents(user.id)).toEqual([])
  })

  it('permission belongs to the account that gave it', async () => {
    const { user } = await signIn(store, 'parent@example.com')
    const { token: otherToken } = await signIn(store, 'stranger@example.com')
    await applyConsentRequest(store, user, { action: 'consent', profileId: kid, isParentAndAdult: true, agrees: true })
    expect((await ask(otherToken, under13)).ran).toBe(false)
  })

  it('a 13+ profile and the original need no permission; a bad id is refused', async () => {
    const { token } = await signIn(store, 'parent@example.com')
    expect((await ask(token, {})).ran).toBe(true)
    expect((await ask(token, { 'x-profile-id': kid, 'x-profile-under-13': '0' })).ran).toBe(true)
    const bad = await ask(token, { 'x-profile-id': '../etc', 'x-profile-under-13': '1' })
    expect(bad.ran).toBe(false)
    expect(bad.res.sent.status).toBe(400)
  })

  it('deleting the account removes every permission', async () => {
    const { user } = await signIn(store, 'parent@example.com')
    await applyConsentRequest(store, user, { action: 'consent', profileId: kid, isParentAndAdult: true, agrees: true })
    await store.deleteUser(user.id)
    expect(await store.listConsents(user.id)).toEqual([])
  })
})
