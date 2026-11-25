// Light, dark, or whatever the phone is set to. Kept in localStorage so it
// applies to every profile on the phone, and so the tiny script in
// index.html can read it before the first paint (no white flash at night).

export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEME_KEY = 'trophy-case.theme'

// The status-bar colours, the same as --color-page in index.css.
const BAR = { light: '#f4f5f7', dark: '#0a0f1c' }

export function getTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

// "system" removes the attribute, so the CSS falls back to the phone's own
// setting. Light or dark sets it, and the CSS follows that instead.
export function applyTheme(choice: ThemeChoice, doc: Document = document): void {
  const root = doc.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)

  // The status bar has one meta per mode. Forced, both get the forced colour.
  const metas = doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  metas.forEach((meta) => {
    const mode = (meta.getAttribute('media') ?? '').includes('dark') ? 'dark' : 'light'
    meta.content = choice === 'system' ? BAR[mode] : BAR[choice]
  })
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, choice)
  } catch {
    // Private browsing can refuse storage; the choice still applies now.
  }
  applyTheme(choice)
}

// What is on screen right now: the stored choice, or the phone's own setting
// when nothing has been chosen.
export function shownTheme(choice: ThemeChoice = getTheme()): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
