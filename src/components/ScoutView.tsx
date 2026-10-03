import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../lib/account'
import { AiSignInRequiredError, AiUnavailableError } from '../lib/aiClient'
import { createAchievement } from '../lib/achievements'
import {
  addScoutMessage,
  askScout,
  clearScoutMessages,
  listScoutMessages,
  pendingChanges,
  pendingProposal,
  prepareAttachment,
  resolveChanges,
  resolveProposal,
  SCOUT_FILE_ACCEPT,
} from '../lib/scout'
import { applyChangeBatch, getUndoInfo, undoLastBatch, type EditUndo } from '../lib/edits'
import type { EditField } from '../lib/aiTypes'
import type { Achievement, ScoutMessage } from '../lib/types'
import CloseButton from './CloseButton'

// A readable name for each editable field, used in the changes card.
export const FIELD_LABEL: Record<EditField, string> = {
  title: 'title',
  note: 'note',
  organisation: 'club or organisation',
  role: 'role',
  result: 'result',
  category: 'category',
}

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
  // Which of the pending changes are ticked, by their position in the list.
  const [ticks, setTicks] = useState<Record<number, boolean>>({})
  // The last confirmed batch, so the student can put it back (22.3).
  const [undoInfo, setUndoInfo] = useState<EditUndo>()
  const fileInput = useRef<HTMLInputElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void listScoutMessages().then(setMessages)
  }, [])

  // Pick up any change that is still waiting for its Undo, so it survives
  // switching tabs (like the offer itself does).
  useEffect(() => {
    void getUndoInfo().then(setUndoInfo)
  }, [])

  // The offer Scout is waiting on an answer for, taken from the saved
  // conversation rather than held in this screen's memory, so leaving the
  // tab and coming back does not lose it.
  const offer = pendingProposal(messages)
  const proposed = offer?.proposed
  const editOffer = pendingChanges(messages)
  // The achievements by id, so the changes card can show which one each edit
  // is for.
  const byId = new Map(achievements.map((a) => [a.id, a] as [string, Achievement]))

  // A new edit proposal starts with every change ticked; changing cards
  // resets the ticks so one card's choices never leak into the next.
  useEffect(() => {
    if (editOffer?.changes) {
      const all: Record<number, boolean> = {}
      editOffer.changes.forEach((_, i) => {
        all[i] = true
      })
      setTicks(all)
    }
  }, [editOffer?.id])

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
      const reply = await addScoutMessage({ role: 'scout', text: answer.reply, proposed: answer.proposed, changes: answer.changes })
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

  // Confirm applies only the ticked changes. It leaves the message in the
  // conversation (marked answered), so the history still reads naturally.
  async function confirmChanges() {
    if (!editOffer?.changes) return
    const chosen = editOffer.changes.filter((_, i) => ticks[i])
    setBusy(true)
    setError(undefined)
    try {
      const report = await applyChangeBatch(chosen)
      await resolveChanges(editOffer.id)
      const succeeded = report.applied.length
      const text = succeeded
        ? `Applied ${report.applied.length} change${report.applied.length === 1 ? '' : 's'}.${
            report.skipped ? ` ${report.skipped} couldn't be applied because they were out of date or no longer valid.` : ''
          }`
        : 'None of those changes could be applied — they had been edited or were no longer valid.'
      const note = await addScoutMessage({ role: 'scout', text })
      const updated = messages.map((m) => (m.id === editOffer.id ? { ...m, changesResolved: true } : m))
      setUndoInfo(report.applied.length ? { applied: report.applied, at: Date.now() } : undefined)
      setMessages([...updated, note])
      setTicks({})
      onSaved()
    } catch {
      setError("That couldn't be applied. The changes were probably edited in the meantime — ask again.")
    } finally {
      setBusy(false)
    }
  }

  // Cancel changes nothing: the message is only marked as answered.
  async function cancelChanges() {
    if (!editOffer) return
    await resolveChanges(editOffer.id)
    setMessages(messages.map((m) => (m.id === editOffer.id ? { ...m, changesResolved: true } : m)))
    setTicks({})
  }

  // Puts back exactly what the last confirmed batch changed, and clears the
  // undo so it cannot be done twice.
  async function undo() {
    setError(undefined)
    try {
      await undoLastBatch()
      setUndoInfo(undefined)
      const note = await addScoutMessage({ role: 'scout', text: 'Undid the last change.' })
      setMessages([...messages, note])
      onSaved()
    } catch {
      setError("That couldn't be undone. Try fixing it from the Timeline tab instead.")
    }
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

      {/* An edit proposal, not a change. Nothing touches the timeline until Confirm. */}
      {editOffer?.changes && (
        <div className="rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/25" data-testid="scout-changes">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Change these?</p>
          <p className="mt-1 text-sm opacity-70">Nothing changes until you confirm. Untick any you don't want.</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {editOffer.changes.map((change, i) => {
              const title = byId.get(change.achievementId)?.title ?? 'an achievement'
              return (
                <label
                  key={`${change.achievementId}-${change.field}-${i}`}
                  className="flex items-start gap-2.5 rounded-xl bg-surface/80 p-2.5 text-sm shadow-sm ring-1 ring-ink/10"
                >
                  <input
                    type="checkbox"
                    checked={!!ticks[i]}
                    onChange={() => setTicks((t) => ({ ...t, [i]: !t[i] }))}
                    data-testid={`change-tick-${i}`}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span className="flex-1">
                    <span className="font-medium">{title}</span>
                    <span className="text-ink/70"> — {FIELD_LABEL[change.field]}</span>
                    {change.old ? (
                      <p className="text-ink/60">
                        “{change.old}” → “{change.new}”
                      </p>
                    ) : (
                      <p className="text-ink/60">add “{change.new}”</p>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              data-testid="changes-cancel"
              onClick={() => void cancelChanges()}
              className="min-h-11 flex-1 rounded-2xl text-sm font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="changes-confirm"
              disabled={busy}
              onClick={() => void confirmChanges()}
              className="min-h-11 flex-1 rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* A confirmed change can be put back, but only until the next one. */}
      {undoInfo && (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-ink/10" data-testid="scout-undo">
          <p className="text-sm">
            Applied {undoInfo.applied.length} change{undoInfo.applied.length === 1 ? '' : 's'}. You can undo them.
          </p>
          <button
            type="button"
            data-testid="scout-undo-button"
            onClick={() => void undo()}
            className="mt-3 min-h-11 w-full rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
          >
            Undo
          </button>
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
