import { describe, expect, it } from 'vitest'
import { buildTextExport, exportFileName } from '../../src/lib/exportText'
import { buildLines, buildPdf, wrap } from '../../src/lib/pdf'
import type { Achievement } from '../../src/lib/types'

function make(overrides: Partial<Achievement>): Achievement {
  return {
    id: 'x', title: 'Title', date: '2026-01-01', category: 'Other', note: '', organisation: '', role: '', result: '',
    createdAt: 0, updatedAt: 0, ...overrides,
  }
}

const rows = [
  make({ id: 'a', title: 'Newest win', date: '2026-09-01', category: 'Sports', organisation: 'Middlesex Magic', result: 'MVP' }),
  make({ id: 'b', title: 'Older win (science)', date: '2025-05-10', category: 'School', note: 'Volcano project' }),
]
const now = new Date(Date.UTC(2026, 8, 21, 12))

describe('text export', () => {
  it('contains every achievement, newest first, and the goal when set', () => {
    const text = buildTextExport(rows, 'Get into a top engineering school', now)
    expect(text).toContain('Goal: Get into a top engineering school')
    expect(text.indexOf('Newest win')).toBeLessThan(text.indexOf('Older win'))
    expect(text).toContain('Middlesex Magic')
    expect(text).toContain('Result: MVP')
    expect(text).toContain('Volcano project')
    expect(text).toContain('2 achievements')
  })

  it('leaves the goal out when there is none', () => {
    expect(buildTextExport(rows, '', now)).not.toContain('Goal:')
  })

  it('names the file by date', () => {
    expect(exportFileName('txt', now)).toBe('trophy-case-2026-09-21.txt')
    expect(exportFileName('pdf', now)).toBe('trophy-case-2026-09-21.pdf')
  })
})

describe('pdf export', () => {
  it('wraps long lines at the width', () => {
    const lines = wrap('one two three four five', 9)
    expect(lines).toEqual(['one two', 'three', 'four five'])
    expect(wrap('abcdefghijkl', 5)).toEqual(['abcde', 'fghij', 'kl'])
    expect(wrap('')).toEqual([''])
  })

  it('builds a valid-looking PDF with every achievement in it', async () => {
    const pdf = buildPdf(rows, 'My goal', now)
    expect(pdf.type).toBe('application/pdf')
    const text = await pdf.text()
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(text).toContain('(Newest win) Tj')
    expect(text).toContain('Older win \\(science\\)') // parentheses escaped
    expect(text).toContain('(Goal: My goal) Tj')
    expect(text).toContain('/Count 1')
  })

  it('splits onto more pages when there is a lot', () => {
    const many = Array.from({ length: 60 }, (_, i) => make({ id: String(i), title: `Win number ${i}` }))
    const lines = buildLines(many, '', now)
    expect(lines.length).toBeGreaterThan(100)
    // Roughly 45 lines fit on a page; 60 achievements at 3 lines each need 4 pages.
    // Check the PDF declares more than one page rather than pinning the exact number.
    return buildPdf(many, '', now).text().then((text) => {
      const count = Number(/\/Count (\d+)/.exec(text)?.[1])
      expect(count).toBeGreaterThan(1)
    })
  })
})
