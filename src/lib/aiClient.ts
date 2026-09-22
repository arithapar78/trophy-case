// The phone's side of the AI photo read: shrink the photo, send it to the
// function with the sign-in token, get a draft back. Nothing here runs
// unless the user asked.

import { authHeaders, rememberUsage } from './account'
import type { PhotoDraft, ReadPhotoRequest, ReadPhotoResponse } from './aiTypes'
import type { UsageStatus } from './aiUsage'
import { todayISO } from './dates'
import { prepareForStorage } from './photos'

const SEND_SIDE = 1024
const JPEG_QUALITY = 0.8

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export class AiUnavailableError extends Error {}
export class AiSignInRequiredError extends Error {}

type WithUsage = { usage?: UsageStatus; code?: string }

// Sends one AI request and handles the answers every AI function shares:
// not signed in, at the limit, or a plain failure. Fresh usage numbers are
// remembered for the whole app.
export async function postAi<T extends { ok: boolean }>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiUnavailableError("Couldn't reach the AI. Check your signal, or fill it in yourself.")
  }
  let result: T & WithUsage & { message?: string }
  try {
    result = (await response.json()) as typeof result
  } catch {
    throw new AiUnavailableError("The AI didn't answer properly. Try again in a minute.")
  }
  rememberUsage(result.usage)
  if (response.status === 401 || result.code === 'signin') throw new AiSignInRequiredError('Sign in to use AI.')
  if (!result.ok) throw new AiUnavailableError(result.message ?? 'The AI did not work this time.')
  return result
}

export async function readPhotoWithAi(photo: Blob): Promise<{ draft: PhotoDraft; mock: boolean }> {
  // Most of a photo call's cost is pixels, so send a small copy.
  const small = await prepareForStorage(photo, SEND_SIDE, JPEG_QUALITY)
  const body: ReadPhotoRequest = { imageBase64: await toBase64(small.blob), today: todayISO() }
  const result = await postAi<ReadPhotoResponse>('/api/read-photo', body)
  if (!result.ok) throw new AiUnavailableError(result.message)
  return { draft: result.draft, mock: result.mock }
}
