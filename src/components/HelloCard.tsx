import { useEffect, useRef, useState } from 'react'
import { greeting, HOW_IT_WORKS, WHATS_NEW, type HelloKind } from '../lib/welcome'
import { MAX_NAME_LENGTH } from '../lib/types'
import CloseButton from './CloseButton'

interface Props {
  kind: HelloKind
  name: string
  // The name box shows the first time, when no name is saved yet, and when
  // opened from Settings (so the name can be changed).
  askName: boolean
  // Called however the card is closed, with whatever is in the name box.
  onDone: (name: string) => void
}

export default function HelloCard({ kind, name, askName, onDone }: Props) {
  const [typed, setTyped] = useState(name)
  // Keeps Escape's listener pointed at the latest typed name.
  const typedRef = useRef(typed)
  typedRef.current = typed

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone(typedRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const done = () => onDone(typed)
  const isWelcome = kind === 'welcome'

  const nameField = askName && (
    <label className={`block ${isWelcome ? 'mb-5' : ''}`}>
      <span className="text-sm font-semibold">What should we call you?</span>
      <span className="block text-sm text-ink/60">Optional. It stays on this phone and is only used to say hi.</span>
      <input
        aria-label="Your name"
        data-testid="hello-name"
        value={typed}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="given-name"
        placeholder="Your first name"
        onChange={(e) => setTyped(e.target.value)}
        className="mt-2 w-full rounded-2xl bg-ink/[0.04] px-4 py-3 ring-1 ring-ink/10"
      />
    </label>
  )

  const steps = (
    <ol className="flex flex-col gap-3">
      {HOW_IT_WORKS.map((step, i) => (
        <li key={step.title} className="flex gap-3">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-ink">
            {i + 1}
          </span>
          <span className="text-sm leading-snug">
            <span className="font-semibold">{step.title}.</span> <span className="text-ink/70">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
  )

  return (
    // Tapping outside does nothing on purpose: a stray thumb should not
    // throw away the card before it has been read.
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hello-title"
        data-testid="hello-card"
        className="animate-sheet flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-sheet bg-surface text-ink shadow-float sm:rounded-3xl"
      >
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 px-5 pb-6 pt-5 text-white">
          {/* White X on the orange, in light and dark mode alike. */}
          <div className="absolute right-3 top-3 rounded-full bg-white/20 [&_button]:border-white/40 [&_button]:text-white">
            <CloseButton onClose={done} />
          </div>
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
              <path d="M12 14v4M9 21h6" />
            </svg>
          </span>
          <h2 id="hello-title" data-testid="hello-greeting" className="mt-3 text-3xl font-bold tracking-tight">
            {greeting(typed)}
          </h2>
          <p className="mt-1 text-white/90">
            {isWelcome ? 'Welcome to Trophy Case, a place to keep every win, big or small.' : "Here's what's new."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isWelcome && nameField}

          {isWelcome ? (
            <>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/45">How it works</h3>
              {steps}
            </>
          ) : (
            <>
              <ul className="flex flex-col gap-3" data-testid="whats-new-list">
                {WHATS_NEW.items.map((item) => (
                  <li key={item.title} className="rounded-2xl bg-ink/[0.03] p-3 ring-1 ring-ink/5">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-ink/70">{item.text}</p>
                  </li>
                ))}
              </ul>
              <details className="mt-5">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-accent-ink">How it works</summary>
                <div className="pt-2">{steps}</div>
              </details>
              <div className="mt-5">{nameField}</div>
            </>
          )}
        </div>

        <div className="border-t border-ink/5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={done}
            data-testid="hello-done"
            className="min-h-12 w-full rounded-2xl bg-accent text-base font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
          >
            {isWelcome ? "Let's go" : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}
