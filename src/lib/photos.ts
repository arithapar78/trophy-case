// Everything about photo files: checking them, resizing them, and stripping
// EXIF. Resizing is done by drawing the photo onto a canvas and re-encoding
// it. The re-encoded JPEG carries none of the original's metadata, which is
// how EXIF (GPS, timestamps) is removed.

import type { PreparedPhoto } from './types'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_STORED_SIDE = 1600
const JPEG_QUALITY = 0.85

export type PhotoCheck = { ok: true } | { ok: false; message: string }

export function checkPhotoFile(file: { type: string; size: number; name?: string }): PhotoCheck {
  const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name ?? '')
  if (!isImage) return { ok: false, message: "That file isn't a photo. Pick a JPG, PNG, WEBP or HEIC." }
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: 'That photo is over 10 MB. Try a smaller one.' }
  return { ok: true }
}

// The size a photo shrinks to so its longest side is at most `max`.
// Smaller photos are left alone.
export function fitWithin(width: number, height: number, max: number = MAX_STORED_SIDE) {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap honours the photo's EXIF orientation, so a portrait
  // shot taken on a phone comes out the right way up.
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to the <img> route below.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Couldn't read that photo."))
    }
    img.src = url
  })
}

export async function prepareForStorage(file: Blob): Promise<PreparedPhoto> {
  const source = await decode(file)
  const { width, height } = fitWithin(source.width, source.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Couldn't process that photo.")
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error("Couldn't process that photo.")
  return { blob, width, height }
}
