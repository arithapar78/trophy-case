// Phase 13: "Export my profile". One file someone else can open: who you
// are at the top (name, goal, totals, the AI summary and strengths if
// written), every achievement below, and the photos at the very bottom as
// proof. It is a single HTML page with the photos inside it, so it opens in
// any browser or in Files on an iPhone, and prints to PDF from there.
// Made on the phone. Nothing is uploaded to make it.

import { formatDate } from './dates'
import { groupByCategory, profileTotals, yearSpan, type SavedSummary } from './profile'
import type { AchievementWithPhotos } from './types'

export interface ProfileExportInput {
  name: string
  goal: string
  summary?: SavedSummary
  rows: AchievementWithPhotos[]
  categories: string[]
  // Photo id -> "data:image/jpeg;base64,..." so the builder stays pure.
  photoData: Map<string, string>
  now: Date
}

// Everything the user typed goes through this before it lands in the page,
// so a title like "<b>MVP</b>" shows as text and can never become markup.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Turns a stored photo into text that can sit inside the page. Works the
// same in the browser and in the unit tests (no FileReader needed).
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}

export function profileExportFileName(now: Date = new Date()): string {
  return `trophy-case-profile-${now.toISOString().slice(0, 10)}.html`
}

// The amber and ink of the app (src/index.css), written out because this
// file is opened outside the app where Tailwind does not exist.
const STYLE = `
  :root { --accent:#f59e0b; --accent-ink:#b45309; --ink:#0f172a; --page:#f4f5f7; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--page); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif; line-height:1.45; }
  main { max-width:760px; margin:0 auto; padding:24px 18px 48px; }
  header.persona { background:var(--accent); color:#fff; border-radius:24px; padding:24px; }
  header.persona p.kicker { margin:0; font-size:12px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; opacity:.9; }
  header.persona h1 { margin:4px 0 0; font-size:32px; }
  header.persona p.goal { margin:8px 0 0; font-size:16px; }
  .card { background:#fff; border-radius:20px; padding:20px; margin-top:16px; box-shadow:0 1px 2px rgb(15 23 42 / .06),0 4px 12px -4px rgb(15 23 42 / .08); }
  .totals { display:flex; text-align:center; }
  .totals div { flex:1; }
  .totals strong { display:block; font-size:24px; }
  .totals span { font-size:12px; color:#64748b; }
  h2 { font-size:18px; margin:0 0 10px; }
  h3 { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; margin:18px 0 6px; }
  ul.strengths { padding:0; list-style:none; margin:12px 0 0; }
  ul.strengths li { padding-left:18px; position:relative; margin-bottom:10px; }
  ul.strengths li::before { content:""; position:absolute; left:0; top:7px; width:9px; height:9px; border-radius:50%; background:var(--accent); }
  .muted { color:#64748b; font-size:13px; }
  .achievement { border-top:1px solid #e2e8f0; padding:10px 0; }
  .achievement:first-of-type { border-top:0; }
  .achievement .title { font-weight:700; }
  .proof-tag a { color:var(--accent-ink); font-size:12px; font-weight:700; }
  .proof { page-break-inside:avoid; break-inside:avoid; }
  .proof img { display:block; max-width:100%; max-height:520px; margin:10px 0 0; border-radius:12px; border:1px solid #e2e8f0; }
  footer { margin-top:24px; text-align:center; }
  @media print { body { background:#fff; } .card { box-shadow:none; border:1px solid #e2e8f0; } header.persona { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`

export function buildProfileHtml(input: ProfileExportInput): string {
  const { name, goal, summary, rows, categories, photoData, now } = input
  const achievements = rows.map((r) => r.achievement)
  const totals = profileTotals(achievements)
  const groups = groupByCategory(rows, categories)
  const titleById = new Map(achievements.map((a) => [a.id, a.title]))
  const exported = formatDate(now.toISOString().slice(0, 10))
  const who = name.trim() || 'My profile'

  // Proof is numbered in the same order the list is shown, so "Proof 2" in
  // the list points at "Proof 2" at the bottom.
  const proofNumber = new Map<string, number>()
  for (const group of groups) {
    for (const row of group.items) {
      if (row.photos.some((p) => photoData.has(p.id))) proofNumber.set(row.achievement.id, proofNumber.size + 1)
    }
  }

  const out: string[] = []
  out.push(
    '<!DOCTYPE html>',
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(who)} · Trophy Case</title>`,
    `<style>${STYLE}</style></head><body><main>`,
  )

  // 1. The persona.
  out.push('<header class="persona" data-section="persona">', '<p class="kicker">Trophy Case profile</p>', `<h1>${escapeHtml(who)}</h1>`)
  if (goal.trim()) out.push(`<p class="goal">Goal: ${escapeHtml(goal.trim())}</p>`)
  out.push('</header>')

  out.push(
    '<section class="card totals">',
    `<div><strong>${totals.achievements}</strong><span>${totals.achievements === 1 ? 'achievement' : 'achievements'}</span></div>`,
    `<div><strong>${totals.categories}</strong><span>${totals.categories === 1 ? 'category' : 'categories'}</span></div>`,
    `<div><strong>${escapeHtml(yearSpan(totals).replace(' to ', '–') || '–')}</strong><span>${totals.firstYear === totals.lastYear ? 'year' : 'years'}</span></div>`,
    `<div><strong>${proofNumber.size}</strong><span>with proof</span></div>`,
    '</section>',
  )

  if (summary) {
    out.push('<section class="card" data-section="summary">', '<h2>Who I am</h2>', `<p>${escapeHtml(summary.text)}</p>`)
    if (summary.strengths.length) {
      out.push('<ul class="strengths">')
      for (const s of summary.strengths) {
        const shownBy = s.achievementIds.map((id) => titleById.get(id)).filter(Boolean) as string[]
        out.push(
          `<li><strong>${escapeHtml(s.name)}</strong>`,
          s.why ? `<div>${escapeHtml(s.why)}</div>` : '',
          shownBy.length ? `<div class="muted">Shown by: ${shownBy.map(escapeHtml).join(', ')}</div>` : '',
          '</li>',
        )
      }
      out.push('</ul>')
    }
    out.push(`<p class="muted">Summary written by AI on ${formatDate(new Date(summary.writtenAt).toISOString().slice(0, 10))} from the achievements below.</p>`, '</section>')
  }

  // 2. Every achievement.
  out.push('<section class="card" data-section="achievements">', '<h2>Achievements</h2>')
  if (groups.length === 0) out.push('<p class="muted">No achievements yet.</p>')
  for (const group of groups) {
    out.push(`<h3>${escapeHtml(group.category)} · ${group.items.length}</h3>`)
    for (const row of group.items) {
      const a = row.achievement
      const whoLine = [a.organisation, a.role].filter(Boolean).join(', ')
      const proof = proofNumber.get(a.id)
      out.push(
        '<div class="achievement">',
        `<div class="title">${escapeHtml(a.title)}</div>`,
        `<div class="muted">${escapeHtml(formatDate(a.date))}${whoLine ? ` · ${escapeHtml(whoLine)}` : ''}</div>`,
        a.result ? `<div>Result: ${escapeHtml(a.result)}</div>` : '',
        a.note ? `<div>${escapeHtml(a.note)}</div>` : '',
        proof ? `<div class="proof-tag"><a href="#proof-${proof}">See proof ${proof}</a></div>` : '',
        '</div>',
      )
    }
  }
  out.push('</section>')

  // 3. Proof, at the bottom.
  if (proofNumber.size > 0) {
    out.push('<section class="card" data-section="proof">', '<h2>Proof</h2>')
    for (const group of groups) {
      for (const row of group.items) {
        const n = proofNumber.get(row.achievement.id)
        if (!n) continue
        out.push(
          `<div class="proof" id="proof-${n}">`,
          `<h3>Proof ${n} · ${escapeHtml(row.achievement.title)} · ${escapeHtml(formatDate(row.achievement.date))}</h3>`,
        )
        for (const photo of [...row.photos].sort((x, y) => x.order - y.order)) {
          const src = photoData.get(photo.id)
          if (src) out.push(`<img src="${src}" alt="Proof for ${escapeHtml(row.achievement.title)}">`)
        }
        out.push('</div>')
      }
    }
    out.push('</section>')
  }

  out.push(`<footer class="muted">Exported ${escapeHtml(exported)} from Trophy Case. To make a PDF, open this file and choose Print, then Save as PDF.</footer>`)
  out.push('</main></body></html>')
  return out.filter(Boolean).join('\n')
}

// Reads every photo and builds the page. The only async part.
export async function makeProfileExport(input: Omit<ProfileExportInput, 'photoData'>): Promise<Blob> {
  const photoData = new Map<string, string>()
  for (const row of input.rows) {
    for (const photo of row.photos) photoData.set(photo.id, await blobToDataUrl(photo.blob))
  }
  return new Blob([buildProfileHtml({ ...input, photoData })], { type: 'text/html' })
}
