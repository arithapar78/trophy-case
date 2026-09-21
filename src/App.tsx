import { useCallback, useEffect, useState } from 'react'
import AchievementCard from './components/AchievementCard'
import AchievementSheet, { type SheetMode } from './components/AchievementSheet'
import CameraButton from './components/CameraButton'
import ConfirmDialog from './components/ConfirmDialog'
import PhotoViewer from './components/PhotoViewer'
import SettingsSheet from './components/SettingsSheet'
import TimelineFilters from './components/TimelineFilters'
import { deleteAchievement, listAchievementsWithPhotos } from './lib/achievements'
import { askForPersistentStorage } from './lib/storage'
import type { AchievementWithPhotos } from './lib/types'

export default function App() {
  const [rows, setRows] = useState<AchievementWithPhotos[]>()
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sheet, setSheet] = useState<SheetMode>()
  const [toDelete, setToDelete] = useState<AchievementWithPhotos>()
  const [viewer, setViewer] = useState<{ row: AchievementWithPhotos; index: number }>()
  const [loadError, setLoadError] = useState<string>()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [filtered, all] = await Promise.all([
        listAchievementsWithPhotos({ search, category }),
        listAchievementsWithPhotos(),
      ])
      setRows(filtered)
      setTotal(all.length)
      setLoadError(undefined)
    } catch {
      setLoadError("Couldn't load your achievements. Try closing and reopening the app.")
    }
  }, [search, category])

  useEffect(() => {
    void reload()
  }, [reload])

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteAchievement(toDelete.achievement.id)
    } finally {
      setToDelete(undefined)
      void reload()
    }
  }

  const closeSheet = useCallback(() => setSheet(undefined), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const closeViewer = useCallback(() => setViewer(undefined), [])
  const cancelDelete = useCallback(() => setToDelete(undefined), [])

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trophy Case</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      <TimelineFilters search={search} category={category} onSearch={setSearch} onCategory={setCategory} />

      {/* Bottom padding keeps the camera button off the last card. */}
      <main className="mt-4 flex flex-col gap-4 pb-40">
        {loadError && <p className="text-red-600">{loadError}</p>}
        {rows && rows.length === 0 && total === 0 && (
          <p className="mt-10 text-center opacity-70">
            Nothing here yet. Tap the camera to save your first win, or add one without a photo.
          </p>
        )}
        {rows && rows.length === 0 && total > 0 && (
          <p className="mt-10 text-center opacity-70">Nothing matches. Try a different search or category.</p>
        )}
        {rows?.map((row) => (
          <AchievementCard
            key={row.achievement.id}
            row={row}
            onEdit={(r) => setSheet({ kind: 'edit', row: r })}
            onDelete={setToDelete}
            onOpenPhoto={(r, index) => setViewer({ row: r, index })}
          />
        ))}
      </main>

      <CameraButton
        onPhoto={(file) => setSheet({ kind: 'add', firstPhoto: file })}
        onAddWithoutPhoto={() => setSheet({ kind: 'add' })}
      />

      {sheet && (
        <AchievementSheet
          mode={sheet}
          onClose={closeSheet}
          onSaved={() => {
            setSheet(undefined)
            // Ask the phone to keep our storage. Only matters once there is
            // something worth keeping, so it happens on the first save.
            void askForPersistentStorage()
            void reload()
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this achievement?"
          message={`"${toDelete.achievement.title}" and its photos will be removed. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      )}

      {settingsOpen && (
        <SettingsSheet achievementCount={total} onClose={closeSettings} onDataChanged={() => void reload()} />
      )}

      {viewer && <PhotoViewer photos={viewer.row.photos} startIndex={viewer.index} onClose={closeViewer} />}
    </div>
  )
}
