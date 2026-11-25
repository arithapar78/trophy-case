// Phase 15: a parent's permission before AI is used for a child under 13.
//
// The phone says, with each AI request, which profile it is for and whether
// that child is under 13 (the birth date never leaves the phone). For an
// under-13 profile the server refuses unless this account has a permission
// record for that profile id.

import type { IncomingMessage } from 'node:http'
import { isValidProfileId } from '../src/lib/family.js'
import type { Store, User } from './store.js'

// Bump when the wording parents agree to changes, so the record says which
// version they saw.
export const CONSENT_VERSION = '2026-11-25'

export const CONSENT_NEEDED_MESSAGE =
  "A parent needs to give permission before AI can be used for this child. Open Settings, then Family."

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

export type ConsentCheck = { ok: true } | { ok: false; status: number; code: string; message: string }

export async function checkChildConsent(store: Store, user: User, req: IncomingMessage): Promise<ConsentCheck> {
  if (header(req, 'x-profile-under-13') !== '1') return { ok: true }
  const profileId = header(req, 'x-profile-id')
  if (!isValidProfileId(profileId)) return { ok: false, status: 400, code: 'profile', message: 'That profile could not be recognised.' }
  if (await store.getConsent(user.id, profileId)) return { ok: true }
  return { ok: false, status: 403, code: 'consent', message: CONSENT_NEEDED_MESSAGE }
}

export interface ConsentRequest {
  action: 'consent' | 'withdraw'
  profileId: string
  isParentAndAdult?: boolean
  agrees?: boolean
}

// Records or withdraws permission. Giving it needs both boxes ticked.
export async function applyConsentRequest(store: Store, user: User, body: unknown, now = Date.now()): Promise<{ ok: boolean; message?: string }> {
  const b = (body ?? {}) as Partial<ConsentRequest>
  if (!isValidProfileId(b.profileId)) return { ok: false, message: 'That profile could not be recognised.' }
  if (b.action === 'withdraw') {
    await store.deleteConsent(user.id, b.profileId)
    return { ok: true }
  }
  if (b.action === 'consent') {
    if (b.isParentAndAdult !== true || b.agrees !== true) return { ok: false, message: 'Both boxes need to be ticked.' }
    await store.putConsent(user.id, b.profileId, { at: now, version: CONSENT_VERSION })
    return { ok: true }
  }
  return { ok: false, message: 'Unknown request.' }
}
