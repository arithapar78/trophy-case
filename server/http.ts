// Plain Node request/response helpers, so the same handlers work on Vercel
// and inside the local dev server.

import type { IncomingMessage, ServerResponse } from 'node:http'

export async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

export async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined && typeof req.body !== 'string') return req.body // Vercel already parsed it
  const text = typeof req.body === 'string' ? req.body : await readRawBody(req)
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// A plain HTML form post (Google's sign-in redirect uses one).
export async function readFormBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, string>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, string>
  const text = typeof req.body === 'string' ? req.body : await readRawBody(req)
  return Object.fromEntries(new URLSearchParams(text))
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie ?? ''
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

export function redirect(res: ServerResponse, location: string): void {
  res.statusCode = 303
  res.setHeader('location', location)
  res.end()
}
