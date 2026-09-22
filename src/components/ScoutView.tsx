import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../lib/account'
import { AiSignInRequiredError, AiUnavailableError } from '../lib/aiClient'
import { createAchievement } from '../lib/achievements'
import {
  addScoutMessage,
  askScout,
  clearScoutMessages,
  listScoutMessages,
  pendingProposal,
  prepareAttachment,
  resolveProposal,
  SCOUT_FILE_ACCEPT,
} from '../lib/scout'
import type { Achievement, ScoutMessage } from '../lib/types'
import CloseButton from './CloseButton'

// Scout: the third tab. A conversation that already knows the goal and the
// timeline, so the student can ask in their own words. Everything shown here
// is kept on the device; only the words and any attached file are sent.
export default function ScoutView({
  achievements,
  goal,
  onOpenSettings,
  onSaved,
}: {
  achievements: Achievement[]
  goal: string
  onOpenSettings: () => void
  onSaved: () => void
}) {
  const { user } = useAccount()
  const [messages, setMessages] = useState<ScoutMessage[]>([])
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [confirmingClear, setConfirmingClear] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void listScoutMessages().then(setMessages)
  }, [])

  // The offer Scout is waiting on an answer for, taken from the saved
  // conversation rather than held in this screen's memory, so leaving the
  // tab and coming back does not lose it.
  const offer = pendingProposal(messages)
  const proposed = offer?.proposed

  // Keep the newest message in view, the way a chat should.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, busy])

  async function send() {
    const text = draft.trim()
    if ((!text && !file) || busy) return
    setBusy(true)
    setError(undefined)

    const chosen = file
    let history: ScoutMessage[] = messages
    try {
      const mine = await addScoutMessage({ role: 'user', text: text || `Sent ${chosen?.name ?? 'a file'}`, attachmentName: chosen?.name })
      history = [...messages, mine]
      setMessages(history)
      setDraft('')
      setFile(undefined)
      if (fileInput.current) fileInput.current.value = ''

      const attachment = chosen ? await prepareAttachment(chosen) : undefined
      const answer = await askScout({ message: text, goal, achievements, history: messages, attachment })
      const reply = await addScoutMessage({ role: 'scout', text: answer.reply, proposed: answer.proposed })
      setMessages([...history, reply])
    } catch (err) {
      if (err instanceof AiSignInRequiredError) setError('Sign in to talk to Scout.')
      else if (err instanceof AiUnavailableError) setError(err.message)
      else setError('That did not work. Try again.')
      setMessages(history)
    } finally {
      setBusy(false)
    }
  }

  function chooseFile(chosen: File | undefined) {
    setError(undefined)
    setFile(chosen)
  }

  async function answerOffer(save: boolean) {
    if (!offer?.proposed) return
    try {
      if (save) await createAchievement({ ...offer.proposed })
      await resolveProposal(offer.id)
      const updated = messages.map((m) => (m.id === offer.id ? { ...m, proposedResolved: true } : m))
      if (save) {
        const note = await addScoutMessage({ role: 'scout', text: `Saved "${offer.proposed.title}" to your timeline.` })
        setMessages([...updated, note])
        onSaved()
      } else {
        setMessages(updated)
      }
    } catch {
      setError("That couldn't be saved. Try adding it from the Timeline tab instead.")
    }
  }

  if (user === null) {
    return (
      <div className="rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/25" data-testid="scout-signin">
        <p className="text-sm">Scout is an AI, so it needs a sign-in before it can talk to you.</p>
        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-3 min-h-11 w-full rounded-2xl px-4 text-sm font-semibold text-accent-ink ring-1 ring-accent/50 transition-colors active:bg-accent/15"
        >
          Sign in to use AI
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" data-testid="scout-view">
      {messages.length === 0 && !busy && (
        <div className="rounded-2xl bg-ink/[0.03] p-4 ring-1 ring-ink/10" data-testid="scout-intro">
          <p className="text-sm font-medium">Ask Scout about your record</p>
          <p className="mt-1 text-sm opacity-70">
            Scout can see your {achievements.length === 0 ? 'timeline' : `${achievements.length} saved achievement${achievements.length === 1 ? '' : 's'}`}
            {goal ? ' and your goal' : ''}. Ask what to put first, what is missing, or how to describe something.
            {!goal && ' Setting a goal in Settings makes the answers sharper.'}
          </p>
          {achievements.length === 0 && (
            <p className="mt-2 text-sm opacity-70">Your timeline is empty, so add an achievement first and Scout will have something to work with.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3" data-testid="scout-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            data-testid={message.role === 'user' ? 'scout-mine' : 'scout-reply'}
            className={
              message.role === 'user'
                ? 'ml-8 self-end rounded-2xl bg-accent px-4 py-3 text-sm text-white shadow-card'
                : 'mr-8 self-start rounded-2xl bg-surface px-4 py-3 text-sm shadow-card ring-1 ring-ink/10'
            }
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
            {message.attachmentName && (
              <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-white/70' : 'opacity-60'}`}>📎 {message.attachmentName}</p>
            )}
          </div>
        ))}
        {busy && (
          <p className="mr-8 self-start rounded-2xl bg-surface px-4 py-3 text-sm opacity-70 shadow-card ring-1 ring-ink/10" data-testid="scout-thinking">
            Scout is thinking…
          </p>
        )}
        <div ref={bottom} />
      </div>

      {/* A suggestion, not a saved thing. Nothing reaches the timeline until Save. */}
      {proposed && (
        <div className="rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/25" data-testid="scout-proposed">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Add this to your timeline?</p>
          <p className="mt-2 text-sm font-medium" data-testid="proposed-title">{proposed.title}</p>
          <p className="text-sm opacity-70">
            {proposed.category} · {proposed.date}
            {proposed.organisation ? ` · ${proposed.organisation}` : ''}
            {proposed.result ? ` · ${proposed.result}` : ''}
          </p>
          {proposed.note && <p className="mt-1 text-sm opacity-70">{proposed.note}</p>}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              data-testid="proposed-discard"
              onClick={() => void answerOffer(false)}
              className="min-h-11 flex-1 rounded-2xl text-sm font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5"
            >
              No thanks
            </button>
            <button
              type="button"
              data-testid="proposed-save"
              onClick={() => void answerOffer(true)}
              className="min-h-11 flex-1 rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
            >
              Save it
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-2xl bg-red-600/10 p-3 text-sm text-red-600" role="alert" data-testid="scout-error">
          {error}
        </p>
      )}

      {/* The composer. The file input is the browser's own, which is what
          gives an iPhone the Photo Library / Take Photo / Browse sheet and a
          computer its ordinary file dialog. */}
      <div className="sticky bottom-20 rounded-2xl bg-surface p-3 shadow-float ring-1 ring-ink/10">
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2 text-sm" data-testid="scout-attachment">
            <span className="flex-1 truncate">📎 {file.name}</span>
            <CloseButton onClose={() => chooseFile(undefined)} label="Remove file" />
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={SCOUT_FILE_ACCEPT}
            data-testid="scout-file"
            className="sr-only"
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
          <button
            type="button"
            aria-label="Attach a file"
            data-testid="scout-attach"
            onClick={() => fileInput.current?.click()}
            className="min-h-11 min-w-11 rounded-2xl text-lg ring-1 ring-ink/10 transition-colors active:bg-ink/5"
          >
            📎
          </button>
          <textarea
            aria-label="Message Scout"
            data-testid="scout-input"
            rows={1}
            value={draft}
            placeholder="Ask Scout something…"
            onChange={(e) => setDraft(e.target.value)}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            data-testid="scout-send"
            disabled={busy || (!draft.trim() && !file)}
            onClick={() => void send()}
            className="min-h-11 rounded-2xl bg-accent px-4 text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98] disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
          >
            Send
          </button>
        </div>
      </div>

      {messages.length > 0 && !confirmingClear && (
        <button
          type="button"
          data-testid="scout-clear"
          onClick={() => setConfirmingClear(true)}
          className="self-center text-sm text-ink/50 underline underline-offset-4"
        >
          Clear this conversation
        </button>
      )}

      {confirmingClear && (
        <div className="rounded-2xl p-4 ring-1 ring-red-600/30" data-testid="scout-clear-confirm">
          <p className="text-sm">This empties the conversation on this device. Your achievements are not touched.</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="min-h-11 flex-1 rounded-2xl text-sm font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5"
            >
              Keep it
            </button>
            <button
              type="button"
              data-testid="scout-clear-confirm-button"
              onClick={() =>
                void clearScoutMessages().then(() => {
                  setMessages([])
                  setConfirmingClear(false)
                })
              }
              className="min-h-11 flex-1 rounded-2xl bg-red-600 text-sm font-semibold text-white"
            >
              Clear it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
