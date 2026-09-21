import { describe, expect, it, vi } from 'vitest'
import { MAX_IMAGE_BASE64_LENGTH } from '../../src/lib/aiTypes'
import { checkRequest, mockDraft, parseModelAnswer, readPhoto } from '../../server/photoRead'
import { CATEGORIES } from '../../src/lib/types'

const today = '2026-09-21'
const request = { imageBase64: 'aGVsbG8=', today }

describe('readPhoto in MOCK mode (no key)', () => {
  it('returns a labelled draft and never calls the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await readPhoto(request)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mock).toBe(true)
      expect(result.draft.title).toMatch(/^MOCK/)
      expect(CATEGORIES).toContain(result.draft.category)
      expect(result.draft.date).toBe(today)
      expect(typeof result.draft.note).toBe('string')
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('mockDraft dates to today', () => {
    expect(mockDraft('2025-01-02').date).toBe('2025-01-02')
  })
})

describe('readPhoto input checks', () => {
  it('rejects a request with no image', async () => {
    expect(await readPhoto(undefined)).toEqual({ ok: false, message: 'No photo was sent.' })
    expect(await readPhoto({ today })).toEqual({ ok: false, message: 'No photo was sent.' })
    expect(await readPhoto({ imageBase64: '', today })).toEqual({ ok: false, message: 'No photo was sent.' })
    expect(await readPhoto({ imageBase64: 'abc', today: 'not a date' })).toEqual({ ok: false, message: 'No photo was sent.' })
    expect(checkRequest(request)).toBe(true)
  })

  it('rejects an image over the size limit', async () => {
    const huge = { imageBase64: 'a'.repeat(MAX_IMAGE_BASE64_LENGTH + 1), today }
    const result = await readPhoto(huge, { apiKey: 'test', callModel: async () => '{}' })
    expect(result).toEqual({ ok: false, message: 'That photo is too big to send. Try again.' })
  })
})

describe('readPhoto with a model', () => {
  it('turns the model answer into a draft', async () => {
    const callModel = vi.fn(async () => 'Sure! {"title":"Regional Science Fair, 1st place","category":"School","date":"2026-05-10","note":"Volcano project"}')
    const result = await readPhoto(request, { apiKey: 'test', callModel })
    expect(callModel).toHaveBeenCalledOnce()
    expect(result).toEqual({
      ok: true,
      mock: false,
      draft: { title: 'Regional Science Fair, 1st place', category: 'School', date: '2026-05-10', note: 'Volcano project' },
    })
  })

  it('falls back safely when the answer is odd', () => {
    expect(parseModelAnswer('nonsense', today)).toEqual({ title: 'Achievement', category: 'Other', date: today, note: '' })
    expect(parseModelAnswer('{"title":"x","category":"Gaming","date":"2099-01-01","note":5}', today)).toEqual({
      title: 'x', category: 'Other', date: today, note: '',
    })
    expect(parseModelAnswer(`{"title":"${'t'.repeat(200)}","category":"Arts","date":null,"note":""}`, today).title).toHaveLength(120)
  })

  it('reports a model failure in plain words', async () => {
    const result = await readPhoto(request, { apiKey: 'test', callModel: async () => { throw new Error('boom') } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/couldn't read/i)
  })
})
