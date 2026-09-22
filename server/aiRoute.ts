// What every AI function does before and after its real work: check the
// sign-in, check the limit, count the use, and attach the usage numbers
// to the answer. One place, so the three functions cannot drift apart.

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { UsageStatus } from '../src/lib/aiUsage.js'
import { authenticate } from './auth.js'
import { readJsonBody, sendJson } from './http.js'
import { getStore } from './storeInstance.js'
import { getUsageFor, useOne } from './usage.js'
import type { Store } from './store.js'

type AiResult = { ok: true; mock: boolean } | { ok: false; message: string }

export interface AiRouteOptions {
  store?: Store
  apiKey?: string
  now?: () => number
}

// Runs `work` for a signed-in user with a use to spare. The answer sent back
// always carries `usage` so the app can show what is left.
export async function runAiRoute<T extends AiResult>(
  req: IncomingMessage,
  res: ServerResponse,
  work: (body: unknown, apiKey: string | undefined) => Promise<T>,
  options: AiRouteOptions = {},
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST.' })
    return
  }
  const store = options.store ?? getStore()
  const now = options.now ?? Date.now
  const apiKey = options.apiKey ?? (process.env.ANTHROPIC_API_KEY || undefined)

  const user = await authenticate(store, req)
  if (!user) {
    sendJson(res, 401, { ok: false, code: 'signin', message: 'Sign in to use AI.' })
    return
  }

  const body = await readJsonBody(req)
  const check = await useOne(store, user, now())
  if (!check.ok) {
    sendJson(res, 429, { ok: false, code: 'limit', message: limitMessage(check.usage, now()), usage: check.usage })
    return
  }

  const result = await work(body, apiKey)
  sendJson(res, result.ok ? 200 : 400, { ...result, usage: result.ok ? check.usage : await getUsageFor(store, user, now()) })
}

function limitMessage(usage: UsageStatus, now: number): string {
  const minutes = usage.nextFreeAt ? Math.max(1, Math.ceil((usage.nextFreeAt - now) / 60_000)) : 0
  const wait = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} minute${minutes === 1 ? '' : 's'}`
  return `You've used all ${usage.limit} AI uses for now. The next one frees up in ${wait}.`
}
