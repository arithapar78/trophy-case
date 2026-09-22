// The account store: who the users are, their sessions, their recent AI
// uses, and (once they pay) their Stripe customer id. That is the whole
// list of what the server keeps. Achievements and photos never come here.
//
// Two versions: an in-memory one for tests and local development, and a
// Redis one (Upstash) for the live site. Both implement the same Store.

import type { Redis } from '@upstash/redis'

export type Plan = 'free' | 'pro'

export interface User {
  id: string
  email: string
  plan: Plan
  createdAt: number
  // Set once the user has been through Stripe's payment page. It is how a
  // message from Stripe finds its way back to the right account. Never a
  // card number: Stripe keeps those, we never see them.
  stripeCustomerId?: string
  // Stripe's own word for the subscription: active, canceled, past_due...
  subscriptionStatus?: string
}

export const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days
const USAGE_TTL_SECONDS = 5 * 60 * 60
// Stripe retries a failed delivery for up to three days, so we only need to
// remember which messages we have handled for a little longer than that.
export const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60

export interface Store {
  getUser(id: string): Promise<User | undefined>
  getUserByEmail(email: string): Promise<User | undefined>
  putUser(user: User): Promise<void>
  deleteUser(id: string): Promise<void>
  createSession(userId: string, token: string): Promise<void>
  getSessionUserId(token: string): Promise<string | undefined>
  deleteSession(token: string): Promise<void>
  readUsage(userId: string): Promise<number[]>
  writeUsage(userId: string, times: number[]): Promise<void>
  getUserByStripeCustomer(customerId: string): Promise<User | undefined>
  // Stripe can deliver the same message twice. markEventSeen returns false
  // if we have handled this id before, so the handler can stop.
  markEventSeen(eventId: string): Promise<boolean>
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function memoryStore(): Store {
  const users = new Map<string, User>()
  const sessions = new Map<string, string>()
  const usage = new Map<string, number[]>()
  const seenEvents = new Set<string>()
  return {
    async getUser(id) {
      return users.get(id)
    },
    async getUserByEmail(email) {
      for (const u of users.values()) if (u.email === normaliseEmail(email)) return u
      return undefined
    },
    async putUser(user) {
      users.set(user.id, user)
    },
    async deleteUser(id) {
      users.delete(id)
      usage.delete(id)
      for (const [token, userId] of sessions) if (userId === id) sessions.delete(token)
    },
    async createSession(userId, token) {
      sessions.set(token, userId)
    },
    async getSessionUserId(token) {
      return sessions.get(token)
    },
    async deleteSession(token) {
      sessions.delete(token)
    },
    async readUsage(userId) {
      return usage.get(userId) ?? []
    },
    async writeUsage(userId, times) {
      usage.set(userId, times)
    },
    async getUserByStripeCustomer(customerId) {
      for (const u of users.values()) if (u.stripeCustomerId === customerId) return u
      return undefined
    },
    async markEventSeen(eventId) {
      if (seenEvents.has(eventId)) return false
      seenEvents.add(eventId)
      return true
    },
  }
}

// Keys: user:<id>, email:<email> -> id, session:<token> -> id (expires),
// sessions:<id> = set of tokens, usage:<id> = JSON list of timestamps
// (expires), customer:<stripe id> -> id, event:<stripe id> (expires).
export function redisStore(redis: Redis): Store {
  return {
    async getUser(id) {
      return (await redis.get<User>(`user:${id}`)) ?? undefined
    },
    async getUserByEmail(email) {
      const id = await redis.get<string>(`email:${normaliseEmail(email)}`)
      return id ? this.getUser(id) : undefined
    },
    async putUser(user) {
      await redis.set(`user:${user.id}`, user)
      await redis.set(`email:${user.email}`, user.id)
      if (user.stripeCustomerId) await redis.set(`customer:${user.stripeCustomerId}`, user.id)
    },
    async deleteUser(id) {
      const user = await this.getUser(id)
      const tokens = await redis.smembers(`sessions:${id}`)
      const keys = [`user:${id}`, `sessions:${id}`, `usage:${id}`, ...tokens.map((t) => `session:${t}`)]
      if (user) keys.push(`email:${user.email}`)
      if (user?.stripeCustomerId) keys.push(`customer:${user.stripeCustomerId}`)
      await redis.del(...keys)
    },
    async createSession(userId, token) {
      await redis.set(`session:${token}`, userId, { ex: SESSION_TTL_SECONDS })
      await redis.sadd(`sessions:${userId}`, token)
    },
    async getSessionUserId(token) {
      return (await redis.get<string>(`session:${token}`)) ?? undefined
    },
    async deleteSession(token) {
      const userId = await redis.get<string>(`session:${token}`)
      await redis.del(`session:${token}`)
      if (userId) await redis.srem(`sessions:${userId}`, token)
    },
    async readUsage(userId) {
      return (await redis.get<number[]>(`usage:${userId}`)) ?? []
    },
    async writeUsage(userId, times) {
      await redis.set(`usage:${userId}`, times, { ex: USAGE_TTL_SECONDS })
    },
    async getUserByStripeCustomer(customerId) {
      const id = await redis.get<string>(`customer:${customerId}`)
      return id ? this.getUser(id) : undefined
    },
    async markEventSeen(eventId) {
      // nx means "only if it is not already there", so the first caller gets
      // a result and any repeat delivery gets null.
      const set = await redis.set(`event:${eventId}`, 1, { nx: true, ex: EVENT_TTL_SECONDS })
      return set !== null
    },
  }
}
