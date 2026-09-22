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
    <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/10 p-3" data-testid="ai-panel">
      {user === null && (
        <>
          <p className="text-sm">Sign in to let AI fill this in from the photo. You can still fill it in yourself.</p>
          <button type="button" onClick={onOpenSettings} className="mt-2 min-h-11 w-full rounded-xl border border-accent px-4 text-sm font-semibold">
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
            className="min-h-11 w-full rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-50"
          >
            Let AI fill this in
          </button>
          <p className="mt-2 text-xs opacity-70">
            {atLimit && usage?.nextFreeAt
              ? `You've used all ${usage.limit} AI uses for now. The next one frees up in ${formatWait(usage.nextFreeAt)}. You can still fill it in yourself.`
              : `Sends a small copy of this photo to Anthropic's AI, which is not stored there.${usage ? ` ${usage.remaining} of ${usage.limit} AI uses left for the next 5 hours.` : ''}`}
          </p>
        </>
      )}
    </div>
  )
}
