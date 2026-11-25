// Phase 13 tests: the exported profile file.

import { describe, expect, it } from 'vitest'
import type { SavedSummary } from '../../src/lib/profile'
import { blobToDataUrl, buildProfileHtml, escapeHtml, profileExportFileName } from '../../src/lib/profileExport'
import type { Achievement, AchievementWithPhotos, Photo } from '../../src/lib/types'

function achievement(id: string, over: Partial<Achievement> = {}): Achievement {
  return { id, title: `Win ${id}`, date: '2026-03-01', category: 'School', note: '', organisation: '', role: '', result: '', createdAt: 1, updatedAt: 1, ...over }
}
function photo(id: string, achievementId: string, order = 0): Photo {
  return { id, achievementId, order, blob: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10 }
}

const now = new Date('2026-11-24T12:00:00Z')
const rows: AchievementWithPhotos[] = [
  { achievement: achievement('a', { title: 'Science fair', result: '1st place', date: '2026-04-01' }), photos: [photo('p1', 'a'), photo('p2', 'a', 1)] },
  { achievement: achievement('b', { title: 'Swim meet', category: 'Sports' }), photos: [] },
  { achievement: achievement('c', { title: 'Regional final', category: 'Sports', date: '2026-05-01' }), photos: [photo('p3', 'c')] },
]
const photoData = new Map([['p1', 'data:image/jpeg;base64,AAA'], ['p2', 'data:image/jpeg;base64,BBB'], ['p3', 'data:image/jpeg;base64,CCC']])
const categories = ['School', 'Sports', 'Other']

describe('T13.1 the profile file', () => {
  it('has the persona first, then the list, then the proof at the bottom', () => {
    const html = buildProfileHtml({ name: 'Ari', goal: 'Top engineering school', rows, categories, photoData, now })
    const persona = html.indexOf('data-section="persona"')
    const list = html.indexOf('data-section="achievements"')
    const proof = html.indexOf('data-section="proof"')
    expect(persona).toBeGreaterThan(-1)
    expect(list).toBeGreaterThan(persona)
    expect(proof).toBeGreaterThan(list)
    expect(html).toContain('<h1>Ari</h1>')
    expect(html).toContain('Goal: Top engineering school')
    // Every photo is inside the file, and only in the proof section.
    for (const src of photoData.values()) {
      expect(html.indexOf(src)).toBeGreaterThan(proof)
    }
  })

  it('numbers proof in list order and links each achievement to its proof', () => {
    const html = buildProfileHtml({ name: 'Ari', goal: '', rows, categories, photoData, now })
    expect(html).toContain('href="#proof-1"')
    expect(html).toContain('id="proof-1"')
    expect(html).toContain('Proof 1 · Science fair')
    expect(html).toContain('Proof 2 · Regional final')
    expect(html).not.toContain('proof-3')
    // Swim meet has no photo, so no proof link.
    const swim = html.slice(html.indexOf('Swim meet'), html.indexOf('Swim meet') + 300)
    expect(swim).not.toContain('See proof')
  })

  it('includes the summary and strengths only when one was written', () => {
    const summary: SavedSummary = {
      text: 'You build things.', strengths: [{ name: 'Science', why: 'Fairs', achievementIds: ['a'] }],
      writtenAt: now.getTime(), goal: '', achievementIds: ['a', 'b', 'c'], mock: false,
    }
    const without = buildProfileHtml({ name: '', goal: '', rows, categories, photoData, now })
    expect(without).not.toContain('data-section="summary"')
    expect(without).toContain('<h1>My profile</h1>')
    const withIt = buildProfileHtml({ name: '', goal: '', summary, rows, categories, photoData, now })
    expect(withIt).toContain('You build things.')
    expect(withIt).toContain('Shown by: Science fair')
  })

  it('escapes everything the user typed', () => {
    const evil = [{ achievement: achievement('x', { title: '<script>alert(1)</script>' }), photos: [] }]
    const html = buildProfileHtml({ name: '<b>Ari</b>', goal: '"quotes"', rows: evil, categories, photoData: new Map(), now })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;Ari&lt;/b&gt;')
    expect(escapeHtml(`a&b'`)).toBe('a&amp;b&#39;')
  })

  it('works with nothing saved, and has no proof section without photos', () => {
    const html = buildProfileHtml({ name: 'Ari', goal: '', rows: [], categories, photoData: new Map(), now })
    expect(html).toContain('No achievements yet.')
    expect(html).not.toContain('data-section="proof"')
  })

  it('turns a photo into a data URL and names the file by date', async () => {
    expect(await blobToDataUrl(new Blob(['hi'], { type: 'image/jpeg' }))).toBe('data:image/jpeg;base64,aGk=')
    expect(profileExportFileName(now)).toBe('trophy-case-profile-2026-11-24.html')
  })
})
