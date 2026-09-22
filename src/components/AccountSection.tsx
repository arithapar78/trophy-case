import { useEffect, useRef, useState } from 'react'
import {
  AccountError,
  deleteAccount,
  fetchConfig,
  signInTestMode,
  signOut,
  useAccount,
  type ServerConfig,
} from '../lib/account'
import { formatWait } from '../lib/aiUsage'
import PlanSection from './PlanSection'

// Google's sign-in script puts this on the window once it has loaded. Only
// the two calls we make are described here.
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; ux_mode: 'redirect'; login_uri: string }) => void
      renderButton: (parent: HTMLElement, options: { theme: string; size: string; width: number; text: string }) => void
    }
  }
}
declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client'

// Loads Google's script once, however many times this component mounts.
function loadGoogleScript(): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`)
  if (existing) return existing.dataset.loaded ? Promise.resolve() : waitFor(existing)
  const script = document.createElement('script')
  script.src = GOOGLE_SCRIPT
  script.async = true
  document.head.appendChild(script)
  return waitFor(script)
}

function waitFor(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener('load', () => {
      script.dataset.loaded = 'yes'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error("Google's sign-in didn't load.")))
  })
}

// The Account block at the top of Settings: who you are signed in as, how
// many AI uses are left, and the ways in and out. Achievements are never
// touched by anything here.
export default function AccountSection() {
  const { user, usage } = useAccount()
  const [config, setConfig] = useState<ServerConfig>()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchConfig()
      .then((c) => !cancelled && setConfig(c))
      .catch(() => !cancelled && setError("Couldn't reach the server, so signing in isn't possible right now."))
    return () => {
      cancelled = true
    }
  }, [])

  // The Google button draws itself into an empty div, so it can only be
  // built once we know the client id and the slot is on screen.
  useEffect(() => {
    const clientId = config?.googleClientId
    const slot = googleSlot.current
    if (!clientId || !slot || user !== null) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          // Redirect, not a popup: a popup never comes back inside an
          // app opened from the iPhone Home Screen.
          ux_mode: 'redirect',
          login_uri: `${window.location.origin}/api/auth/google`,
        })
        window.google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', width: 280, text: 'continue_with' })
      })
      .catch(() => !cancelled && setError("Google's sign-in didn't load. Check your signal and try again."))
    return () => {
      cancelled = true
    }
  }, [config?.googleClientId, user])

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(undefined)
    try {
      await work()
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const button = 'min-h-12 w-full rounded-2xl px-4 py-3 text-left ring-1 ring-ink/10 transition-colors active:bg-ink/5 disabled:opacity-40'

  return (
    <section className="mt-4" data-testid="account-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Account</h3>

      {user === undefined && <p className="mt-1 text-sm opacity-70">Checking…</p>}

      {user === null && (
        <>
          <p className="mt-1 text-sm">
            Sign in to use the AI features. Saving, editing, backup and export all work without one. Your achievements are never
            sent to the server.
          </p>

          {config?.googleClientId && <div ref={googleSlot} className="mt-3" data-testid="google-button" />}

          {config?.devLogin && (
            <div className="mt-3 rounded-2xl bg-ink/[0.03] p-4 ring-1 ring-ink/10">
              <p className="text-sm font-medium">Test-mode sign-in</p>
              <p className="text-sm opacity-70">For development only. Any email works, and this is off on the live site.</p>
              <input
                aria-label="Test-mode email"
                data-testid="dev-email"
                value={email}
                type="email"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/10"
              />
              <button
                type="button"
                data-testid="dev-signin"
                disabled={busy || !email.includes('@')}
                onClick={() => void run(() => signInTestMode(email))}
                className="mt-2 min-h-11 w-full rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98] disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
              >
                Sign in for testing
              </button>
            </div>
          )}

          {config && !config.accountsReady && (
            <p className="mt-3 rounded-2xl bg-red-600/10 p-3 text-sm text-red-600">
              Accounts are not set up on the server yet, so signing in won't work. The server needs its Upstash Redis database
              connected in Vercel.
            </p>
          )}

          {config && !config.googleClientId && !config.devLogin && config.accountsReady && (
            <p className="mt-3 rounded-2xl bg-red-600/10 p-3 text-sm text-red-600">
              Google sign-in is not set up on the server yet. It needs GOOGLE_CLIENT_ID in Vercel.
            </p>
          )}
        </>
      )}

      {user && (
        <>
          <p className="mt-1 text-sm" data-testid="account-email">
            Signed in as {user.email} · {user.plan === 'pro' ? 'Pro' : 'Free'}
          </p>
          <p className="mt-1 text-sm opacity-70" data-testid="ai-usage">
            {usage ? `${usage.remaining} of ${usage.limit} AI uses left for the next 5 hours` : 'AI uses left: checking…'}
            {usage?.nextFreeAt ? `. The next one frees up in ${formatWait(usage.nextFreeAt)}` : ''}.
          </p>

          <PlanSection billing={config?.billing} />

          <div className="mt-3 flex flex-col gap-3">
            <button type="button" className={button} data-testid="sign-out" disabled={busy} onClick={() => void run(signOut)}>
              <span className="font-medium">Sign out</span>
              <span className="block text-sm opacity-70">Your achievements stay on this device</span>
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                className={`${button} border-red-600/40 text-red-600`}
                data-testid="delete-account"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                <span className="font-medium">Delete my account</span>
                <span className="block text-sm opacity-70">Removes your email and usage count from the server</span>
              </button>
            ) : (
              <div className="rounded-2xl p-4 ring-1 ring-red-600/30">
                <p className="text-sm">
                  This removes your email, your sign-ins and your usage count from the server. Your achievements and photos on
                  this device are not touched.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="min-h-12 flex-1 rounded-2xl font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep my account
                  </button>
                  <button
                    type="button"
                    className="min-h-12 flex-1 rounded-2xl bg-red-600 font-semibold text-white disabled:opacity-40"
                    data-testid="delete-account-confirm"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await deleteAccount()
                        setConfirmingDelete(false)
                      })
                    }
                  >
                    Delete my account
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-2xl bg-red-600/10 p-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
