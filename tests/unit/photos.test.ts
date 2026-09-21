import { describe, expect, it } from 'vitest'
import { checkPhotoFile, fitWithin, MAX_PHOTO_BYTES } from '../../src/lib/photos'

describe('checkPhotoFile', () => {
  it('accepts JPG, PNG, WEBP and HEIC', () => {
    expect(checkPhotoFile({ type: 'image/jpeg', size: 1000 }).ok).toBe(true)
    expect(checkPhotoFile({ type: 'image/png', size: 1000 }).ok).toBe(true)
    expect(checkPhotoFile({ type: 'image/webp', size: 1000 }).ok).toBe(true)
    expect(checkPhotoFile({ type: 'image/heic', size: 1000 }).ok).toBe(true)
    // Some browsers report no type for HEIC; the file name still tells us.
    expect(checkPhotoFile({ type: '', size: 1000, name: 'IMG_0001.HEIC' }).ok).toBe(true)
  })

  it('rejects a PDF and other non-photos', () => {
    const pdf = checkPhotoFile({ type: 'application/pdf', size: 1000, name: 'cert.pdf' })
    expect(pdf.ok).toBe(false)
    if (!pdf.ok) expect(pdf.message).toMatch(/isn't a photo/)
    expect(checkPhotoFile({ type: 'application/zip', size: 1000 }).ok).toBe(false)
  })

  it('rejects a photo over 10 MB', () => {
    expect(checkPhotoFile({ type: 'image/jpeg', size: MAX_PHOTO_BYTES }).ok).toBe(true)
    const big = checkPhotoFile({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })
    expect(big.ok).toBe(false)
    if (!big.ok) expect(big.message).toMatch(/10 MB/)
  })
})

describe('fitWithin', () => {
  it('shrinks so the long side is at most 1600', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('leaves small photos alone', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1600, 900)).toEqual({ width: 1600, height: 900 })
  })
})
