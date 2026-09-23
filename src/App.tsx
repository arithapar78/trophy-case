import { useCallback, useEffect, useState } from 'react'
import AchievementCard from './components/AchievementCard'
import AchievementSheet, { type SheetMode } from './components/AchievementSheet'
import CameraButton from './components/CameraButton'
import ConfirmDialog from './components/ConfirmDialog'
import PhotoViewer from './components/PhotoViewer'
import RankedView from './components/RankedView'
import ScoutView from './components/ScoutView'
import SettingsSheet from './components/SettingsSheet'
import TimelineFilters from './components/TimelineFilters'
import { confirmUpgrade, refreshAccount, takeBillingResultFromUrl, takeTokenFromUrl } from './lib/account'
import { deleteAchievement, listAchievementsWithPhotos } from './lib/achievements'
import { categoriesInUse, getCategories } from './lib/categories'
import { getGoal } from './lib/goal'
import { askForPersistentStorage } from './lib/storage'
import { STARTER_CATEGORIES, type AchievementWithPhotos } from './lib/types'

const STARTER = new Set<string>(STARTER_CATEGORIES)

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
  const [view, setView] = useState<'timeline' | 'ranked' | 'scout'>('timeline')
  const [allRows, setAllRows] = useState<AchievementWithPhotos[]>([])
  const [goal, setGoal] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [usedCategories, setUsedCategories] = useState<string[]>([])

  const reload = useCallback(async () => {
    try {
      const [filtered, all, savedGoal, allCategories, inUse] = await Promise.all([
        listAchievementsWithPhotos({ search, category }),
        listAchievementsWithPhotos(),
        getGoal(),
        getCategories(),
        categoriesInUse(),
      ])
      // If the chosen filter's category was renamed, deleted or emptied,
      // go back to All rather than showing an empty list with no chip lit.
      if (category !== 'All' && !inUse.includes(category)) {
        setCategory('All')
        return
      }
      setCategories(allCategories)
      setUsedCategories(inUse)
      setRows(filtered)
      setAllRows(all)
      setGoal(savedGoal)
      setTotal(all.length)
      setLoadError(undefined)
    } catch {
      setLoadError("Couldn't load your achievements. Try closing and reopening the app.")
    }
  }, [search, category])

  useEffect(() => {
    void reload()
  }, [reload])

  // On start: pick up a session token Google's redirect left in the address
  // bar, then ask the server who is signed in. Stripe also sends people back
  // here, so check for that too and open Settings on the way through, since
  // that is where the plan is shown.
  useEffect(() => {
    takeTokenFromUrl()
    const billing = takeBillingResultFromUrl()
    if (billing) setSettingsOpen(true)
    if (billing === 'success') {
      // Stripe returns the user before it tells our server about the
      // payment, so keep asking for a few seconds rather than showing Free.
      void confirmUpgrade()
    } else {
      void refreshAccount()
    }
  }, [])

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
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between bg-page/85 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
              <path d="M12 14v4M9 21h6" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Trophy Case</h1>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink/70 shadow-card ring-1 ring-ink/10 transition-colors active:bg-ink/5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      <div className="mb-4 flex rounded-2xl bg-ink/5 p-1" role="tablist" aria-label="View">
        {(['timeline', 'ranked', 'scout'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-10 flex-1 rounded-xl text-sm font-semibold transition-colors ${
              view === v ? 'bg-surface text-ink shadow-card' : 'text-ink/55'
            }`}
          >
            {v === 'timeline' ? 'Timeline' : v === 'ranked' ? 'Ranked' : 'Scout'}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        <TimelineFilters
          search={search}
          category={category}
          categoriesInUse={usedCategories}
          onSearch={setSearch}
          onCategory={setCategory}
        />
      )}

      {/* Bottom padding keeps the camera button off the last card. */}
      <main className="mt-4 flex flex-col gap-4 pb-48">
        {loadError && <p className="text-red-600">{loadError}</p>}
        {view === 'ranked' && (
          <RankedView achievements={allRows.map((r) => r.achievement)} goal={goal} onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {view === 'scout' && (
          <ScoutView
            achievements={allRows.map((r) => r.achievement)}
            goal={goal}
            onOpenSettings={() => setSettingsOpen(true)}
            onSaved={() => void reload()}
          />
        )}
        {view === 'timeline' && rows && rows.length === 0 && total === 0 && (
          <div className="mt-12 flex flex-col items-center px-6 text-center">
            <span aria-hidden="true" className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent-ink">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
                <path d="M12 14v4M9 21h6" />
              </svg>
            </span>
            <p className="text-lg font-semibold">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink/60">
              Tap the camera to save your first win, or add one without a photo.
            </p>
          </div>
        )}
        {view === 'timeline' && rows && rows.length === 0 && total > 0 && (
          <p className="mt-12 text-center text-sm text-ink/60">Nothing matches. Try a different search or category.</p>
        )}
        {view === 'timeline' && rows?.map((row) => (
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
          categories={categories}
          onCategoriesChanged={() => void reload()}
          onClose={closeSheet}
          onOpenSettings={() => {
            setSheet(undefined)
            setSettingsOpen(true)
          }}
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
        <SettingsSheet
          achievementCount={total}
          goal={goal}
          customCategories={categories.filter((c) => !STARTER.has(c))}
          onClose={closeSettings}
          onDataChanged={() => void reload()}
        />
      )}

      {viewer && <PhotoViewer photos={viewer.row.photos} startIndex={viewer.index} onClose={closeViewer} />}
    </div>
  )
}
