import { useAccount } from '../lib/account'
import { formatWait } from '../lib/aiUsage'

export type AiState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; mock: boolean }
  | { kind: 'error'; message: string }

interface Props {
  state: AiState
  onRun: () => void
  onOpenSettings: () => void
}

// The "Let AI fill this in" box shown above the fields whenever the sheet
// has a photo. Off by default: nothing happens until the button is tapped
// (or the Settings switch is on). Needs a sign-in, so the limit follows
// the person and not the phone.
export default function AiPhotoPanel({ state, onRun, onOpenSettings }: Props) {
  const { user, usage } = useAccount()
  const atLimit = usage?.remaining === 0

  return (
    <div className="mb-4 rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/25" data-testid="ai-panel">
      {user === null && (
        <>
          <p className="text-sm">Sign in to let AI fill this in from the photo. You can still fill it in yourself.</p>
          <button type="button" onClick={onOpenSettings} className="mt-3 min-h-11 w-full rounded-2xl px-4 text-sm font-semibold text-accent-ink ring-1 ring-accent/50 transition-colors active:bg-accent/15">
            Sign in to use AI
          </button>
        </>
      )}

      {user && state.kind === 'running' && (
        <p className="text-sm" role="status">
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent align-middle" />
          Reading your photo…
        </p>
      )}

      {user && state.kind === 'done' && (
        <p className="text-sm" role="status">
          {state.mock ? (
            <>
              <strong>MOCK draft.</strong> The AI function has no key yet, so this is a sample. Change anything, then save.
            </>
          ) : (
            <>Here's a draft from the photo. Change anything, then save.</>
          )}
        </p>
      )}

      {user && state.kind === 'error' && (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      )}

      {user && (state.kind === 'idle' || state.kind === 'error') && (
        <>
          <button
            type="button"
            onClick={onRun}
            disabled={atLimit}
            className="min-h-11 w-full rounded-2xl bg-accent px-4 font-semibold text-white shadow-card transition-transform active:scale-[0.98] disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
          >
            Let AI fill this in
          </button>
          <p className="mt-2 text-xs leading-relaxed text-ink/60">
            {atLimit && usage?.nextFreeAt
              ? `The AI is resting for a moment, back in ${formatWait(usage.nextFreeAt)}. You can still fill this in yourself.`
              : "Sends a small copy of this photo to Anthropic's AI, which is not stored there."}
          </p>
        </>
      )}
    </div>
  )
}
