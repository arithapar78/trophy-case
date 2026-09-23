// Phase 12 tests: which hello card shows, and the name used to say hi.

import { beforeEach, describe, expect, it } from 'vitest'
import { deleteEverything } from '../../src/lib/backup'
import { db } from '../../src/lib/db'
import { MAX_NAME_LENGTH } from '../../src/lib/types'
import { cleanName } from '../../src/lib/validation'
import { getName, greeting, helloToShow, loadHello, markWhatsNewSeen, setName, WHATS_NEW } from '../../src/lib/welcome'

describe('which card shows (T12.1)', () => {
  it('a brand new device gets the welcome', () => {
    expect(helloToShow(undefined, 0, 'v2')).toBe('welcome')
  })

  it('a device that saw an older list gets what is new', () => {
    expect(helloToShow('v1', 0, 'v2')).toBe('whatsNew')
    expect(helloToShow('v1', 12, 'v2')).toBe('whatsNew')
  })

  it('a device that saw this list gets nothing', () => {
    expect(helloToShow('v2', 5, 'v2')).toBeUndefined()
  })

  it('someone who had the app before Phase 12 gets what is new, not the welcome', () => {
    expect(helloToShow(undefined, 3, 'v2')).toBe('whatsNew')
  })
})

describe('stored on the device', () => {
  beforeEach(async () => {
    await deleteEverything()
  })

  it('shows the welcome, then nothing once seen', async () => {
    expect((await loadHello()).kind).toBe('welcome')
    await markWhatsNewSeen()
    expect((await loadHello()).kind).toBeUndefined()
  })

  it('an older seen id brings back what is new', async () => {
    await markWhatsNewSeen('an-old-list')
    expect((await loadHello()).kind).toBe('whatsNew')
    expect(WHATS_NEW.id).not.toBe('an-old-list')
  })

  it('saves a cleaned name and an empty one removes it', async () => {
    expect(await setName('  Ari  ')).toBe('Ari')
    expect(await getName()).toBe('Ari')
    expect((await loadHello()).name).toBe('Ari')
    await setName('   ')
    expect(await getName()).toBe('')
    expect(await db.settings.get('name')).toBeUndefined()
  })

  it('delete everything forgets the name and what was seen', async () => {
    await setName('Ari')
    await markWhatsNewSeen()
    await deleteEverything()
    expect(await loadHello()).toEqual({ kind: 'welcome', name: '' })
  })
})

describe('the name (T12.2)', () => {
  it('is trimmed and extra spaces are squeezed', () => {
    expect(cleanName('  Mary   Jane ')).toBe('Mary Jane')
  })

  it('is cut to the limit', () => {
    expect(cleanName('a'.repeat(50))).toHaveLength(MAX_NAME_LENGTH)
  })

  it('an empty name means Hi there', () => {
    expect(greeting('')).toBe('Hi there')
    expect(greeting('   ')).toBe('Hi there')
    expect(greeting(' Ari ')).toBe('Hi Ari')
  })
})
