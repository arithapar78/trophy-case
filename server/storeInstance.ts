// Picks the store for this server: Redis when Upstash is connected to the
// Vercel project (its settings arrive as environment variables), otherwise
// memory. Memory is fine for development and tests; on the live site it
// would forget sign-ins between requests, so accounts refuse to work there
// until Redis is connected (see accountsReady).

import { Redis } from '@upstash/redis'
import { memoryStore, redisStore, type Store } from './store.js'

let store: Store | undefined

export function hasRedis(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  )
}

export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

export function accountsReady(): boolean {
  return hasRedis() || !isProduction()
}

export function getStore(): Store {
  if (store) return store
  if (hasRedis()) {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
    store = redisStore(new Redis({ url: url!, token: token! }))
  } else {
    store = memoryStore()
  }
  return store
}

// Tests swap in their own store.
export function setStoreForTests(s: Store | undefined): void {
  store = s
}
