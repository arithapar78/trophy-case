import { useCallback, useEffect, useState } from 'react'
import AchievementCard from './components/AchievementCard'
import AchievementSheet, { type SheetMode } from './components/AchievementSheet'
import CameraButton from './components/CameraButton'
import ConfirmDialog from './components/ConfirmDialog'
import PhotoViewer from './components/PhotoViewer'
import TimelineFilters from './components/TimelineFilters'
import { deleteAchievement, listAchievementsWithPhotos } from './lib/achievements'
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
  const closeViewer = useCallback(() => setViewer(undefined), [])
  const cancelDelete = useCallback(() => setToDelete(undefined), [])

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Trophy Case</h1>
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

      {viewer && <PhotoViewer photos={viewer.row.photos} startIndex={viewer.index} onClose={closeViewer} />}
    </div>
  )
}
