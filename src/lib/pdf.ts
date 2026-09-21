// Builds a simple text-only PDF by hand, with no library. A PDF is a text
// file with a few numbered objects and a table of where each one starts.
// Courier is used because every character is the same width, which makes
// wrapping lines exact. Characters outside the basic Latin set are replaced
// with "?" (a limit of the built-in fonts).

import { achievementLines } from './exportText'
import { formatDate } from './dates'
import type { Achievement } from './types'

const PAGE_WIDTH = 612 // US Letter, in points (1/72 inch)
const PAGE_HEIGHT = 792
const MARGIN = 54
const FONT_SIZE = 11
const LINE_HEIGHT = 15
const CHAR_WIDTH = FONT_SIZE * 0.6 // Courier
const CHARS_PER_LINE = Math.floor((PAGE_WIDTH - 2 * MARGIN) / CHAR_WIDTH)
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT)

interface Line {
  text: string
  bold?: boolean
}

export function wrap(text: string, width: number = CHARS_PER_LINE): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const chunks = word.length > width ? word.match(new RegExp(`.{1,${width}}`, 'g'))! : [word]
    for (const chunk of chunks) {
      if (!current) current = chunk
      else if (current.length + 1 + chunk.length <= width) current += ' ' + chunk
      else {
        lines.push(current)
        current = chunk
      }
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function toPdfText(text: string): string {
  // Only what the built-in fonts can show, then escape PDF's special characters.
  const safe = text.replace(/[^\x20-\x7E]/g, (ch) => (ch === '·' ? '-' : '?'))
  return safe.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function buildLines(achievements: Achievement[], goal: string, now: Date): Line[] {
  const lines: Line[] = [{ text: 'TROPHY CASE', bold: true }, { text: `Exported ${formatDate(now.toISOString().slice(0, 10))}` }]
  if (goal) {
    lines.push({ text: '' })
    for (const l of wrap(`Goal: ${goal}`)) lines.push({ text: l })
  }
  lines.push({ text: '' }, { text: `${achievements.length} achievement${achievements.length === 1 ? '' : 's'}` }, { text: '' })
  for (const a of achievements) {
    const [title, ...rest] = achievementLines(a)
    for (const l of wrap(title)) lines.push({ text: l, bold: true })
    for (const detail of rest) for (const l of wrap(detail)) lines.push({ text: l })
    lines.push({ text: '' })
  }
  return lines
}

function pageContent(lines: Line[]): string {
  const parts: string[] = ['BT', `${LINE_HEIGHT} TL`, `${MARGIN} ${PAGE_HEIGHT - MARGIN - FONT_SIZE} Td`]
  let bold: boolean | undefined
  for (const line of lines) {
    if (line.bold !== bold) {
      parts.push(`/${line.bold ? 'F2' : 'F1'} ${FONT_SIZE} Tf`)
      bold = line.bold
    }
    parts.push(`(${toPdfText(line.text)}) Tj T*`)
  }
  parts.push('ET')
  return parts.join('\n')
}

export function buildPdf(achievements: Achievement[], goal: string, now: Date = new Date()): Blob {
  const lines = buildLines(achievements, goal, now)
  const pages: Line[][] = []
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE))
  if (pages.length === 0) pages.push([])

  // Objects: 1 catalog, 2 pages, 3 font regular, 4 font bold, then a page
  // and a content stream per page.
  const objects: string[] = []
  const pageIds = pages.map((_, i) => 5 + i * 2)
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>')
  pages.forEach((page, i) => {
    const contentId = pageIds[i] + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    )
    const content = pageContent(page)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) out += `${String(offset).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Blob([out], { type: 'application/pdf' })
}
