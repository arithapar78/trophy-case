// A clean list of achievements as plain text, for a counselor, a coach or
// an application form. Newest first, the goal at the top if set.

import { formatDate } from './dates'
import type { Achievement } from './types'

export function achievementLines(a: Achievement): string[] {
  const lines = [a.title, `${formatDate(a.date)} · ${a.category}`]
  const who = [a.organisation, a.role].filter(Boolean).join(', ')
  if (who) lines.push(who)
  if (a.result) lines.push(`Result: ${a.result}`)
  if (a.note) lines.push(a.note)
  return lines
}

export function buildTextExport(achievements: Achievement[], goal: string, now: Date = new Date()): string {
  const out: string[] = ['TROPHY CASE', `Exported ${formatDate(now.toISOString().slice(0, 10))}`]
  if (goal) out.push('', `Goal: ${goal}`)
  out.push('', `${achievements.length} achievement${achievements.length === 1 ? '' : 's'}`, '')
  for (const a of achievements) {
    out.push(...achievementLines(a), '')
  }
  return out.join('\n').trimEnd() + '\n'
}

export function exportFileName(extension: 'txt' | 'pdf', now: Date = new Date()): string {
  return `trophy-case-${now.toISOString().slice(0, 10)}.${extension}`
}
