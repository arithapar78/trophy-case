import { useEffect, useRef, useState } from 'react'
import { getAlwaysReadPhotos, setAlwaysReadPhotos } from '../lib/aiSettings'
import { formatWait, getUsage } from '../lib/aiUsage'
import { BadBackupError, backupFileName, buildBackup, deleteEverything, restoreBackup } from '../lib/backup'
import { shareOrDownload } from '../lib/share'
import { formatBytes, getStorageUsage, type StorageUsage } from '../lib/storage'

interface Props {
  achievementCount: number
  onClose: () => void
  onDataChanged: () => void
}

export default function SettingsSheet({ achievementCount, onClose, onDataChanged }: Props) {
  const [usage, setUsage] = useState<StorageUsage>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')
  const [alwaysAi, setAlwaysAi] = useState(() => getAlwaysReadPhotos())
  const aiUsage = getUsage()
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getStorageUsage().then(setUsage)
  }, [achievementCount, message])

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

  const wipe = () =>
    run('Deleting', async () => {
      await deleteEverything()
      setConfirmingDelete(false)
      setDeleteWord('')
      onDataChanged()
      return 'Everything has been deleted.'
    })

  const button = 'min-h-12 w-full rounded-xl border border-ink/20 px-4 text-left disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/20" />
        <h2 className="text-xl font-bold">Settings</h2>

        <section className="mt-4">
          <h3 className="text-sm font-medium opacity-70">Your data</h3>
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
          <h3 className="text-sm font-medium opacity-70">AI</h3>
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
          <p className="mt-2 text-sm opacity-70" data-testid="ai-usage">
            {aiUsage.remaining} of 10 AI uses left for the next 5 hours
            {aiUsage.nextFreeAt ? `. Next one frees up in ${formatWait(aiUsage.nextFreeAt)}` : ''}.
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

        {message && <p className="mt-4 rounded-xl bg-accent/15 p-3 text-sm" role="status">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-600/10 p-3 text-sm text-red-600" role="alert">{error}</p>}

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
            <div className="rounded-xl border border-red-600/40 p-4">
              <p className="text-sm">
                This removes every achievement and photo from this device and can't be undone. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                aria-label="Type DELETE to confirm"
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value)}
                className="mt-3 w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3"
                autoCapitalize="characters"
              />
              <div className="mt-3 flex gap-3">
                <button type="button" className="min-h-12 flex-1 rounded-xl border border-ink/20" onClick={() => { setConfirmingDelete(false); setDeleteWord('') }}>
                  Keep my data
                </button>
                <button
                  type="button"
                  className="min-h-12 flex-1 rounded-xl bg-red-600 text-white disabled:opacity-50"
                  disabled={deleteWord !== 'DELETE' || busy}
                  onClick={() => void wipe()}
                >
                  Delete everything
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs opacity-50">Trophy Case {__APP_VERSION__}</p>

        <button type="button" onClick={onClose} className="mt-4 min-h-12 w-full rounded-xl bg-accent font-semibold text-white">
          Done
        </button>
      </div>
    </div>
  )
}
