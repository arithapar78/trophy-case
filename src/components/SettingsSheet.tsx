import { useEffect, useRef, useState } from 'react'
import AccountSection from './AccountSection'
import CloseButton from './CloseButton'
import { getAlwaysReadPhotos, setAlwaysReadPhotos } from '../lib/aiSettings'
import { listAchievements } from '../lib/achievements'
import { BadBackupError, backupFileName, buildBackup, deleteEverything, restoreBackup } from '../lib/backup'
import { buildTextExport, exportFileName } from '../lib/exportText'
import { getGoal, setGoal as storeGoal } from '../lib/goal'
import { buildPdf } from '../lib/pdf'
import { MAX_GOAL_LENGTH } from '../lib/types'
import { shareOrDownload } from '../lib/share'
import { formatBytes, getStorageUsage, type StorageUsage } from '../lib/storage'

interface Props {
  achievementCount: number
  // The saved goal, handed in by the app so the field is right from the
  // first frame. Loading it here instead could overwrite what the user
  // had already started typing.
  goal: string
  onClose: () => void
  onDataChanged: () => void
}

export default function SettingsSheet({ achievementCount, goal: savedGoal, onClose, onDataChanged }: Props) {
  const [usage, setUsage] = useState<StorageUsage>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')
  const [alwaysAi, setAlwaysAi] = useState(() => getAlwaysReadPhotos())
  const [goal, setGoal] = useState(savedGoal)
  const [goalSaved, setGoalSaved] = useState(false)
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getStorageUsage().then(setUsage)
  }, [achievementCount, message])

  async function saveGoal() {
    const cleaned = await storeGoal(goal)
    setGoal(cleaned)
    setGoalSaved(true)
    onDataChanged()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function run(label: string, work: () => Promise<string>) {
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      setMessage(await work())
    } catch (err) {
      if (err instanceof BadBackupError) setError(err.message)
      else setError(`${label} didn't work. ${err instanceof Error ? err.message : 'Try again.'}`)
    } finally {
      setBusy(false)
    }
  }

  const backUp = () =>
    run('Backing up', async () => {
      const blob = await buildBackup()
      const how = await shareOrDownload(blob, backupFileName())
      return how === 'downloaded' ? 'Backup saved to your downloads.' : 'Backup ready to share.'
    })

  const restore = (file: File) =>
    run('Restoring', async () => {
      const summary = await restoreBackup(file)
      onDataChanged()
      return `Restored ${summary.achievements} achievement${summary.achievements === 1 ? '' : 's'} and ${summary.photos} photo${summary.photos === 1 ? '' : 's'}.`
    })

  const exportText = () =>
    run('Exporting', async () => {
      const blob = new Blob([buildTextExport(await listAchievements(), await getGoal())], { type: 'text/plain' })
      const how = await shareOrDownload(blob, exportFileName('txt'))
      return how === 'downloaded' ? 'Text file saved to your downloads.' : 'Text file ready to share.'
    })

  const exportPdf = () =>
    run('Exporting', async () => {
      const blob = buildPdf(await listAchievements(), await getGoal())
      const how = await shareOrDownload(blob, exportFileName('pdf'))
      return how === 'downloaded' ? 'PDF saved to your downloads.' : 'PDF ready to share.'
    })

  const wipe = () =>
    run('Deleting', async () => {
      await deleteEverything()
      setConfirmingDelete(false)
      setDeleteWord('')
      onDataChanged()
      return 'Everything has been deleted.'
    })

  const button = 'min-h-12 w-full rounded-2xl px-4 py-3 text-left ring-1 ring-ink/10 transition-colors active:bg-ink/5 disabled:opacity-40'

  return (
    <div className="animate-fade fixed inset-0 z-30 flex items-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="animate-sheet max-h-[92vh] w-full overflow-y-auto rounded-t-sheet bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/20" />

        {/* Stays put while the sheet scrolls, so there is always a way out. */}
        <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-3 bg-surface px-5 pb-3">
          <h2 className="text-xl font-bold">Settings</h2>
          <CloseButton onClose={onClose} />
        </div>

        <AccountSection />

        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Your data</h3>
          <p className="mt-1 text-sm">
            {achievementCount} achievement{achievementCount === 1 ? '' : 's'} saved on this device
            {usage && `, using ${formatBytes(usage.usedBytes)}`}
            {usage?.quotaBytes ? ` of about ${formatBytes(usage.quotaBytes)} available` : ''}.
          </p>
          <p className="mt-1 text-sm opacity-70">
            Everything stays on this phone. A backup is the only copy anywhere else, so make one now and then.
          </p>
        </section>

        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Your goal</h3>
          <p className="mt-1 text-sm opacity-70">One sentence. The Ranked view uses it to sort your achievements and suggest what to do next.</p>
          <input
            aria-label="Goal"
            value={goal}
            maxLength={MAX_GOAL_LENGTH}
            placeholder="get into a top engineering school"
            onChange={(e) => { setGoal(e.target.value); setGoalSaved(false) }}
            className="mt-2 w-full rounded-2xl bg-ink/[0.04] px-4 py-3 ring-1 ring-ink/10"
          />
          <button type="button" onClick={() => void saveGoal()} className="mt-2 min-h-11 rounded-2xl bg-accent px-5 text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98]">
            {goalSaved ? 'Goal saved' : 'Save goal'}
          </button>
        </section>

        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">AI</h3>
          <label className="mt-2 flex min-h-12 items-center justify-between gap-4">
            <span>
              <span className="font-medium">Always let AI read my photos</span>
              <span className="block text-sm opacity-70">
                Off means nothing is sent unless you tap the button. On sends a small copy of each new photo to Anthropic's AI, which is not stored there.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={alwaysAi}
              onChange={(e) => {
                setAlwaysAi(e.target.checked)
                setAlwaysReadPhotos(e.target.checked)
              }}
              className="h-6 w-6 shrink-0 accent-accent"
            />
          </label>
          <p className="mt-2 text-sm opacity-70">
            AI needs a sign-in, and each use is counted against your account. The count is in the Account section above.
          </p>
        </section>

        <section className="mt-5 flex flex-col gap-3">
          <button type="button" className={button} onClick={() => void backUp()} disabled={busy || achievementCount === 0}>
            <span className="font-medium">Back up everything</span>
            <span className="block text-sm opacity-70">One zip file with your achievements and photos</span>
          </button>
          <button type="button" className={button} onClick={() => restoreRef.current?.click()} disabled={busy}>
            <span className="font-medium">Restore from backup</span>
            <span className="block text-sm opacity-70">Choose a Trophy Case backup zip</span>
          </button>
          <button type="button" className={button} onClick={() => void exportPdf()} disabled={busy || achievementCount === 0}>
            <span className="font-medium">Export as PDF</span>
            <span className="block text-sm opacity-70">A clean list for a counselor or an application. No photos</span>
          </button>
          <button type="button" className={button} onClick={() => void exportText()} disabled={busy || achievementCount === 0}>
            <span className="font-medium">Export as text</span>
            <span className="block text-sm opacity-70">The same list as plain text</span>
          </button>
          <input
            ref={restoreRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            data-testid="restore-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void restore(file)
            }}
          />
        </section>

        {message && <p className="mt-4 rounded-2xl bg-accent/15 p-3 text-sm" role="status">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-600/10 p-3 text-sm text-red-600" role="alert">{error}</p>}

        <section className="mt-6">
          {!confirmingDelete ? (
            <button
              type="button"
              className={`${button} border-red-600/40 text-red-600`}
              onClick={() => setConfirmingDelete(true)}
              disabled={busy || achievementCount === 0}
            >
              <span className="font-medium">Delete everything</span>
              <span className="block text-sm opacity-70">Removes every achievement and photo from this device</span>
            </button>
          ) : (
            <div className="rounded-2xl p-4 ring-1 ring-red-600/30">
              <p className="text-sm">
                This removes every achievement and photo from this device and can't be undone. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                aria-label="Type DELETE to confirm"
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value)}
                className="mt-3 w-full rounded-2xl bg-ink/[0.04] px-4 py-3 ring-1 ring-ink/10"
                autoCapitalize="characters"
              />
              <div className="mt-3 flex gap-3">
                <button type="button" className="min-h-12 flex-1 rounded-2xl font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5" onClick={() => { setConfirmingDelete(false); setDeleteWord('') }}>
                  Keep my data
                </button>
                <button
                  type="button"
                  className="min-h-12 flex-1 rounded-2xl bg-red-600 font-semibold text-white disabled:opacity-40"
                  disabled={deleteWord !== 'DELETE' || busy}
                  onClick={() => void wipe()}
                >
                  Delete everything
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-ink/40">Trophy Case {__APP_VERSION__}</p>

        <button type="button" onClick={onClose} className="mt-5 min-h-12 w-full rounded-2xl bg-accent font-semibold text-white shadow-card transition-transform active:scale-[0.98]">
          Done
        </button>
      </div>
    </div>
  )
}
