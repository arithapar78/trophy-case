// The phone's side of the AI photo read: shrink the photo, send it to the
// function, get a draft back. Nothing here runs unless the user asked.

import type { PhotoDraft, ReadPhotoRequest, ReadPhotoResponse } from './aiTypes'
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

export async function readPhotoWithAi(photo: Blob): Promise<{ draft: PhotoDraft; mock: boolean }> {
  // Most of a photo call's cost is pixels, so send a small copy.
  const small = await prepareForStorage(photo, SEND_SIDE, JPEG_QUALITY)
  const body: ReadPhotoRequest = { imageBase64: await toBase64(small.blob), today: todayISO() }

  let response: Response
  try {
    response = await fetch('/api/read-photo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiUnavailableError("Couldn't reach the AI. Check your signal, or fill it in yourself.")
  }

  let result: ReadPhotoResponse
  try {
    result = (await response.json()) as ReadPhotoResponse
  } catch {
    throw new AiUnavailableError("The AI didn't answer properly. Fill it in yourself this time.")
  }
  if (!result.ok) throw new AiUnavailableError(result.message)
  return { draft: result.draft, mock: result.mock }
}
