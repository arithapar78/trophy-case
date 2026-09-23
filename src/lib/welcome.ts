// The hello card (Phase 12): a welcome the first time, and "what's new"
// after an update. The words live here; the component only shows them.
// Everything is kept on the device. The name is never sent anywhere.

import { db } from './db'
import { cleanName } from './validation'

// Change `id` whenever `items` changes. A new id is what makes the card
// show again on every device that saw the old one.
export const WHATS_NEW = {
  id: '2026-09-welcome',
  items: [
    { title: 'The Me tab', text: 'Everything you have done on one page, a short read on your strengths, and a card you can save as a picture.' },
    { title: 'Your own categories', text: 'Make categories that fit you, like Robotics or Debate. Settings, then Categories.' },
    { title: 'Scout', text: 'A chat that knows your goal and your achievements. Ask it what to do next.' },
    { title: 'This card', text: 'It says hello and shows what changed. Open it again any time from Settings.' },
  ],
} as const

export const HOW_IT_WORKS = [
  { title: 'Snap it', text: 'Tap the camera and take a photo of a certificate, a medal or a scoreboard. No photo? Add it by hand.' },
  { title: 'Save it', text: 'It lands on your timeline. Everything stays on this phone.' },
  { title: 'Set a goal', text: 'In Settings. Ranked then sorts your wins by what matters most for it.' },
  { title: 'Ask Scout', text: 'Chat about your goal and what to do next.' },
] as const

// 'welcome' = brand new here. 'whatsNew' = has used the app before.
export type HelloKind = 'welcome' | 'whatsNew'

// Which card to show when the app opens, if any. Someone who already has
// achievements but has never seen a card had the app before Phase 12, so
// they get what's new rather than a first-time welcome.
export function helloToShow(lastSeenId: string | undefined, achievementCount: number, currentId: string = WHATS_NEW.id): HelloKind | undefined {
  if (lastSeenId === currentId) return undefined
  if (lastSeenId === undefined && achievementCount === 0) return 'welcome'
  return 'whatsNew'
}

export function greeting(name: string): string {
  const cleaned = cleanName(name)
  return cleaned ? `Hi ${cleaned}` : 'Hi there'
}

export async function getName(): Promise<string> {
  const row = await db.settings.get('name')
  return typeof row?.value === 'string' ? row.value : ''
}

export async function setName(name: string): Promise<string> {
  const cleaned = cleanName(name)
  if (cleaned) await db.settings.put({ key: 'name', value: cleaned })
  else await db.settings.delete('name')
  return cleaned
}

export async function getLastSeenWhatsNew(): Promise<string | undefined> {
  const row = await db.settings.get('whatsNewSeen')
  return typeof row?.value === 'string' ? row.value : undefined
}

export async function markWhatsNewSeen(id: string = WHATS_NEW.id): Promise<void> {
  await db.settings.put({ key: 'whatsNewSeen', value: id })
}

// What App asks on start: which card, and the saved name to greet with.
export async function loadHello(): Promise<{ kind: HelloKind | undefined; name: string }> {
  const [lastSeen, count, name] = await Promise.all([getLastSeenWhatsNew(), db.achievements.count(), getName()])
  return { kind: helloToShow(lastSeen, count), name }
}
