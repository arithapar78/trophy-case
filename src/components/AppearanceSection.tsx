import { useState } from 'react'
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme'

const CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Match phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Settings, Appearance: light, dark, or follow the phone. Applies at once
// and to every profile on this phone.
export default function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(() => getTheme())

  return (
    <section className="mt-5" data-testid="appearance-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Appearance</h3>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-ink/[0.06] p-1" role="group" aria-label="Appearance">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={choice === c.value}
            data-testid={`theme-${c.value}`}
            onClick={() => {
              setTheme(c.value)
              setChoice(c.value)
            }}
            className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition-colors ${
              choice === c.value ? 'bg-accent text-white shadow-card' : 'text-ink/60'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}
