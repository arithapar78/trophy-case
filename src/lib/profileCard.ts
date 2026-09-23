// Draws the Me tab's profile card as a picture, so it can be posted or sent.
// It uses the browser's own canvas: no library, nothing uploaded. The
// picture is made on the phone and handed straight to the share sheet.
//
// The layout maths (wrapping text into lines) is kept separate from the
// drawing so it can be unit-tested without a browser.

import type { ProfileSummary } from './aiTypes'
import { yearSpan, type CategoryBar, type ProfileTotals } from './profile'

// Portrait, the shape Instagram and phone screens both like.
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

// Splits text into lines that fit `maxWidth`, measured by `measure`. If it
// needs more than `maxLines`, the last line ends in "…".
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (measure(attempt) <= maxWidth || !current) {
      current = attempt
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 0 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd()
  kept[maxLines - 1] = `${last}…`
  return kept
}

export function profileCardFileName(now: Date = new Date()): string {
  return `trophy-case-profile-${now.toISOString().slice(0, 10)}.png`
}

export interface CardData {
  summary?: ProfileSummary
  totals: ProfileTotals
  bars: CategoryBar[]
}

const INK = '#0f172a'
const MUTED = '#64748b'
const ACCENT = '#f59e0b'
const ACCENT_INK = '#b45309'
const PAGE = '#f4f5f7'
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif'

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawProfileCard(data: CardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error("This browser can't draw pictures."))

  const pad = 72
  const inner = CARD_WIDTH - pad * 2
  const measure = (s: string) => ctx.measureText(s).width

  // Page and header band.
  ctx.fillStyle = PAGE
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 0, CARD_WIDTH, 300)
  ctx.fillStyle = '#ffffff'
  ctx.font = font(600, 34)
  ctx.fillText('TROPHY CASE', pad, 90)
  ctx.font = font(800, 76)
  ctx.fillText('Who I am', pad, 170)

  // Totals: three big numbers on a white card overlapping the band.
  let y = 220
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, pad, y, inner, 170, 36)
  ctx.fill()
  const totals: [string, string][] = [
    [String(data.totals.achievements), data.totals.achievements === 1 ? 'achievement' : 'achievements'],
    [String(data.totals.categories), data.totals.categories === 1 ? 'category' : 'categories'],
    [yearSpan(data.totals).replace(' to ', '–') || '–', data.totals.firstYear === data.totals.lastYear ? 'year' : 'years'],
  ]
  const column = inner / 3
  totals.forEach(([big, small], i) => {
    const cx = pad + column * i + column / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = INK
    ctx.font = font(800, big.length > 5 ? 44 : 60)
    ctx.fillText(big, cx, y + 92)
    ctx.fillStyle = MUTED
    ctx.font = font(500, 28)
    ctx.fillText(small, cx, y + 138)
  })
  ctx.textAlign = 'left'
  y += 170 + 64

  // The summary paragraph and strengths, when written.
  if (data.summary) {
    ctx.fillStyle = INK
    ctx.font = font(500, 36)
    for (const line of wrapLines(data.summary.text, inner, measure, 6)) {
      ctx.fillText(line, pad, y)
      y += 50
    }
    y += 24
    for (const strength of data.summary.strengths.slice(0, 4)) {
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.arc(pad + 12, y - 12, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = INK
      ctx.font = font(700, 34)
      const [name] = wrapLines(strength.name, inner - 44, measure, 1)
      ctx.fillText(name, pad + 44, y)
      y += 56
    }
    y += 16
  }

  // A small bar chart of achievements per category.
  const barsTop = y
  const room = CARD_HEIGHT - 110 - barsTop
  // Only as many bars as fit at a readable size; the biggest come first.
  const bars = data.bars.slice(0, Math.max(1, Math.floor(room / 56)))
  const rowHeight = Math.min(70, Math.floor(room / Math.max(1, bars.length)))
  // Wide enough for "Clubs & Leadership" and "Community Service" whole.
  const labelWidth = 440
  const barMax = inner - labelWidth - 80
  bars.forEach((bar, i) => {
    const rowY = barsTop + i * rowHeight
    ctx.fillStyle = INK
    ctx.font = font(600, Math.min(28, rowHeight - 24))
    const [label] = wrapLines(bar.category, labelWidth - 20, measure, 1)
    ctx.fillText(label, pad, rowY + rowHeight / 2 + 10)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)'
    roundRect(ctx, pad + labelWidth, rowY + 10, barMax, rowHeight - 24, (rowHeight - 24) / 2)
    ctx.fill()
    ctx.fillStyle = ACCENT
    roundRect(ctx, pad + labelWidth, rowY + 10, Math.max(rowHeight - 24, barMax * bar.fraction), rowHeight - 24, (rowHeight - 24) / 2)
    ctx.fill()
    ctx.fillStyle = ACCENT_INK
    ctx.font = font(700, 30)
    ctx.textAlign = 'right'
    ctx.fillText(String(bar.count), CARD_WIDTH - pad, rowY + rowHeight / 2 + 10)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = MUTED
  ctx.font = font(500, 26)
  ctx.fillText('Made with Trophy Case', pad, CARD_HEIGHT - 56)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't make the picture."))), 'image/png')
  })
}
