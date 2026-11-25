// Phase 15: more than one trophy case on a phone.
//
// Each profile gets its own database. The original one keeps the database
// it always had ("trophy-case"), so nothing moves for people who already use
// the app; a child's profile gets "trophy-case-<id>". Because every screen
// already reads through `db`, giving each profile its own database keeps
// their achievements, goal, Scout chat and summary apart with no other code
// knowing profiles exist.
//
// The list of profiles is small and is read before any database opens, so
// it lives in localStorage. It stays on this phone: names and birth dates
// are never sent anywhere.

import { checkAge } from './ageGate.js'
import { cleanName } from './validation.js'

export const MAIN_PROFILE_ID = 'main'
export const MAX_PROFILES = 8
const LIST_KEY = 'trophy-case.profiles'
const CURRENT_KEY = 'trophy-case.current-profile'

export interface ChildProfile {
  id: string
  name: string
  birthYear: number
  birthMonth: number // 1 to 12
  createdAt: number
}

export function databaseNameFor(profileId: string): string {
  return profileId === MAIN_PROFILE_ID ? 'trophy-case' : `trophy-case-${profileId}`
}

// The same month rule as the sign-in age check, so "under 13" means one
// thing everywhere in the app.
export function isUnder13(profile: Pick<ChildProfile, 'birthYear' | 'birthMonth'>, now: Date = new Date()): boolean {
  return checkAge(profile.birthYear, profile.birthMonth, now) === 'under13'
}

// Ids go to the server with AI requests, so they are short and random and
// say nothing about the child.
export function isValidProfileId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9]{8,32}$/.test(id)
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16)
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function isChildProfile(value: unknown): value is ChildProfile {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<ChildProfile>
  return (
    isValidProfileId(p.id) &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    Number.isInteger(p.birthYear) &&
    Number.isInteger(p.birthMonth) &&
    typeof p.createdAt === 'number'
  )
}

export function listChildren(): ChildProfile[] {
  const raw = read<unknown>(LIST_KEY, [])
  return Array.isArray(raw) ? raw.filter(isChildProfile) : []
}

// Which profile is open. Anything unknown falls back to the original, so a
// removed or corrupted id can never leave the app with no case to show.
export function currentProfileId(): string {
  const id = read<unknown>(CURRENT_KEY, MAIN_PROFILE_ID)
  if (id === MAIN_PROFILE_ID) return MAIN_PROFILE_ID
  return listChildren().some((c) => c.id === id) ? (id as string) : MAIN_PROFILE_ID
}

export function currentChild(): ChildProfile | undefined {
  const id = currentProfileId()
  return listChildren().find((c) => c.id === id)
}

export function setCurrentProfile(id: string): void {
  write(CURRENT_KEY, id)
}

export type NewChildProblem = 'name' | 'date' | 'full'

export function checkNewChild(name: string, birthYear: number, birthMonth: number, now: Date = new Date()): NewChildProblem | undefined {
  if (!cleanName(name)) return 'name'
  if (checkAge(birthYear, birthMonth, now) === 'invalid') return 'date'
  if (listChildren().length >= MAX_PROFILES - 1) return 'full'
  return undefined
}

export function addChild(name: string, birthYear: number, birthMonth: number, now: Date = new Date()): ChildProfile {
  const problem = checkNewChild(name, birthYear, birthMonth, now)
  if (problem) throw new Error(problem)
  const child: ChildProfile = { id: newId(), name: cleanName(name), birthYear, birthMonth, createdAt: now.getTime() }
  write(LIST_KEY, [...listChildren(), child])
  return child
}

export function forgetChild(id: string): void {
  write(LIST_KEY, listChildren().filter((c) => c.id !== id))
  if (read<unknown>(CURRENT_KEY, MAIN_PROFILE_ID) === id) setCurrentProfile(MAIN_PROFILE_ID)
}

// Sent with every AI request, so the server can insist on a parent's
// permission for a child under 13. Only the random id and a yes/no travel.
export function profileHeaders(now: Date = new Date()): Record<string, string> {
  const child = currentChild()
  if (!child) return {}
  return { 'x-profile-id': child.id, 'x-profile-under-13': isUnder13(child, now) ? '1' : '0' }
}
