// The three sign-in routes now share one serverless function (Vercel's free
// plan allows at most 12). These check that each address still reaches the
// right route, however Vercel hands the address over.

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { authActionFromUrl, authDispatch } from '../../server/authRoutes'

describe('one function for the three sign-in routes', () => {
  it('reads the route from the address, with or without a query', () => {
    expect(authActionFromUrl('/api/auth/google')).toBe('google')
    expect(authActionFromUrl('/api/auth/dev?x=1')).toBe('dev')
    expect(authActionFromUrl('/api/auth/[action]?action=signout')).toBe('signout')
    expect(authActionFromUrl(undefined)).toBeUndefined()
  })

  it('answers 404 for an unknown route and runs a known one', async () => {
    const answer = async (url: string, method = 'GET') => {
      let status = 0
      const res = { statusCode: 0, setHeader() {}, end() { status = this.statusCode } }
      const req = { url, method, headers: {}, on() {}, async *[Symbol.asyncIterator]() {} }
      await authDispatch(req as never, res as never)
      return status
    }
    expect(await answer('/api/auth/nope')).toBe(404)
    // A GET to the Google route is refused by that route itself, which
    // proves the address reached it.
    expect(await answer('/api/auth/google')).toBe(405)
    expect(await answer('/api/auth/signout', 'POST')).toBe(200)
  })

  it('keeps the deployment within the free plan: at most 12 serverless functions', () => {
    const count = (dir: string): number =>
      readdirSync(dir, { withFileTypes: true }).reduce(
        (n, entry) => n + (entry.isDirectory() ? count(join(dir, entry.name)) : entry.name.endsWith('.ts') ? 1 : 0),
        0,
      )
    expect(count(join(__dirname, '../../api'))).toBeLessThanOrEqual(12)
  })
})
