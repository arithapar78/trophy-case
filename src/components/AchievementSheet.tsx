import { useEffect, useRef, useState } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { createAchievement, updateAchievement, ValidationError } from '../lib/achievements'
import { AiSignInRequiredError, AiUnavailableError, readPhotoWithAi } from '../lib/aiClient'
import { getAlwaysReadPhotos } from '../lib/aiSettings'
import { getToken } from '../lib/account'
import AiPhotoPanel, { type AiState } from './AiPhotoPanel'
import { todayISO } from '../lib/dates'
import { checkPhotoFile, prepareForStorage } from '../lib/photos'
import { CATEGORIES, MAX_PHOTOS, type AchievementWithPhotos, type Photo, type PhotoPlanItem, type PreparedPhoto } from '../lib/types'
import { LIMITS, type FieldErrors } from '../lib/validation'

export type SheetMode = { kind: 'add'; firstPhoto?: File } | { kind: 'edit'; row: AchievementWithPhotos }

interface Props {
  mode: SheetMode
  onClose: () => void
  onSaved: () => void
  onOpenSettings: () => void
}

// A photo shown in the sheet: either one already stored, or one just chosen
// that is being resized in the background.
type SheetPhoto =
  | { key: string; kind: 'existing'; photo: Photo }
  | { key: string; kind: 'new'; file: File; prepared?: PreparedPhoto; error?: string }

interface Fields {
  title: string
  category: string
  date: string
  note: string
  organisation: string
  role: string
  result: string
}

function initialFields(mode: SheetMode): Fields {
  if (mode.kind === 'edit') {
    const a = mode.row.achievement
    return { title: a.title, category: a.category, date: a.date, note: a.note, organisation: a.organisation, role: a.role, result: a.result }
  }
  return { title: '', category: '', date: todayISO(), note: '', organisation: '', role: '', result: '' }
}

function initialPhotos(mode: SheetMode): SheetPhoto[] {
  if (mode.kind === 'edit') {
    return mode.row.photos.map((photo) => ({ key: photo.id, kind: 'existing', photo }))
  }
  return []
}

let photoKey = 0

function Thumb({ item, onRemove }: { item: SheetPhoto; onRemove: () => void }) {
  const url = useObjectUrl(item.kind === 'existing' ? item.photo.blob : item.file)
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink/10">
      {url && !('error' in item && item.error) && <img src={url} alt="" className="h-full w-full object-cover" />}
      {item.kind === 'new' && item.error && (
        <p className="p-1 text-[10px] leading-tight text-red-600">{item.error}</p>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
      >
        ×
      </button>
    </div>
  )
}

export default function AchievementSheet({ mode, onClose, onSaved, onOpenSettings }: Props) {
  const [fields, setFields] = useState<Fields>(() => initialFields(mode))
  const [photos, setPhotos] = useState<SheetPhoto[]>(() => initialPhotos(mode))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState<string>()
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ai, setAi] = useState<AiState>({ kind: 'idle' })
  const titleRef = useRef<HTMLInputElement>(null)
  const addPhotoRef = useRef<HTMLInputElement>(null)
  const openedRef = useRef(false)

  // Resize each new photo as soon as it arrives, so Save has nothing to wait for.
  function addFiles(files: File[]) {
    const room = MAX_PHOTOS - photos.length
    const accepted = files.slice(0, room)
    if (files.length > room) setErrors((e) => ({ ...e, photos: `You can add up to ${MAX_PHOTOS} photos.` }))

    const items: SheetPhoto[] = accepted.map((file) => {
      const check = checkPhotoFile(file)
      return { key: `new-${photoKey++}`, kind: 'new', file, error: check.ok ? undefined : check.message }
    })
    setPhotos((current) => [...current, ...items])

    for (const item of items) {
      if (item.kind !== 'new' || item.error) continue
      prepareForStorage(item.file)
        .then((prepared) => setPhotos((current) => current.map((p) => (p.key === item.key ? { ...p, prepared } : p))))
        .catch((err: Error) =>
          setPhotos((current) => current.map((p) => (p.key === item.key ? { ...p, error: err.message } : p))),
        )
    }
  }

  // Sends the first photo to the AI and fills the fields with its draft.
  // Only ever called because the user tapped the button, or turned on
  // "always" in Settings.
  async function runAi(photo: Blob) {
    setAi({ kind: 'running' })
    try {
      const { draft, mock } = await readPhotoWithAi(photo)
      setFields((f) => ({ ...f, title: draft.title, category: draft.category, date: draft.date, note: draft.note || f.note }))
      if (draft.note) setShowMore(true)
      setAi({ kind: 'done', mock })
    } catch (err) {
      if (err instanceof AiSignInRequiredError) setAi({ kind: 'idle' })
      else setAi({ kind: 'error', message: err instanceof AiUnavailableError ? err.message : "The AI didn't work this time. Fill it in yourself." })
    }
  }

  useEffect(() => {
    // Runs once when the sheet opens. The ref guard matters because React's
    // development mode runs effects twice, which would add the photo twice.
    if (openedRef.current) return
    openedRef.current = true
    if (mode.kind === 'add' && mode.firstPhoto) {
      addFiles([mode.firstPhoto])
      if (getAlwaysReadPhotos() && getToken()) void runAi(mode.firstPhoto)
    }
    titleRef.current?.focus()
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (name: keyof Fields) => (value: string) => setFields((f) => ({ ...f, [name]: value }))

  const firstNewPhoto = photos.find((p): p is Extract<SheetPhoto, { kind: 'new' }> => p.kind === 'new' && !p.error)?.file
  const photoProblems = photos.filter((p) => p.kind === 'new' && p.error)
  const stillPreparing = photos.some((p) => p.kind === 'new' && !p.prepared && !p.error)

  async function save() {
    setSaveError(undefined)
    if (photoProblems.length > 0) {
      setErrors((e) => ({ ...e, photos: 'Remove the photos that could not be read, then save.' }))
      return
    }
    setSaving(true)
    try {
      if (mode.kind === 'add') {
        const prepared = photos.flatMap((p) => (p.kind === 'new' && p.prepared ? [p.prepared] : []))
        await createAchievement(fields, prepared)
      } else {
        const plan: PhotoPlanItem[] = photos.map((p) =>
          p.kind === 'existing' ? { kind: 'existing', id: p.photo.id } : { kind: 'new', photo: p.prepared! },
        )
        await updateAchievement(mode.row.achievement.id, fields, plan)
      }
      onSaved()
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.errors)
      else setSaveError(err instanceof Error ? err.message : "Couldn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3'
  const labelClass = 'mb-1 block text-sm font-medium'

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={mode.kind === 'add' ? 'New achievement' : 'Edit achievement'}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/20" />

        {/* Photo strip */}
        <div className="mb-4 flex gap-2 overflow-x-auto" data-testid="photo-strip">
          {photos.map((item) => (
            <Thumb key={item.key} item={item} onRemove={() => setPhotos((c) => c.filter((p) => p.key !== item.key))} />
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => addPhotoRef.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-ink/30 text-xs"
            >
              <span className="text-2xl leading-none">+</span>
              {photos.length === 0 ? 'Add photo' : 'Add another'}
            </button>
          )}
          <input
            ref={addPhotoRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            data-testid="add-photo-input"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) addFiles(files)
            }}
          />
        </div>
        {errors.photos && <p className="-mt-2 mb-3 text-sm text-red-600">{errors.photos}</p>}

        {mode.kind === 'add' && firstNewPhoto && (
          <AiPhotoPanel state={ai} onRun={() => void runAi(firstNewPhoto)} onOpenSettings={onOpenSettings} />
        )}

        <label className={labelClass} htmlFor="title">Title</label>
        <input
          id="title"
          ref={titleRef}
          value={fields.title}
          onChange={(e) => set('title')(e.target.value)}
          maxLength={LIMITS.title + 1}
          className={fieldClass}
          placeholder="What did you do?"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}

        <p className={`${labelClass} mt-4`}>Category</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={fields.category === c}
              onClick={() => set('category')(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                fields.category === c ? 'border-accent bg-accent text-white' : 'border-ink/20'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}

        <label className={`${labelClass} mt-4`} htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={fields.date}
          max={todayISO()}
          onChange={(e) => set('date')(e.target.value)}
          className={fieldClass}
        />
        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}

        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          className="mt-4 min-h-11 text-sm underline underline-offset-4"
        >
          {showMore ? 'Fewer details' : 'More details'}
        </button>

        {showMore && (
          <div className="mt-2 flex flex-col gap-3">
            <div>
              <label className={labelClass} htmlFor="note">Note</label>
              <textarea id="note" value={fields.note} onChange={(e) => set('note')(e.target.value)} rows={3} className={fieldClass} />
              {errors.note && <p className="mt-1 text-sm text-red-600">{errors.note}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="organisation">Team, club or school</label>
              <input id="organisation" value={fields.organisation} onChange={(e) => set('organisation')(e.target.value)} className={fieldClass} />
              {errors.organisation && <p className="mt-1 text-sm text-red-600">{errors.organisation}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="role">Your role</label>
              <input id="role" value={fields.role} onChange={(e) => set('role')(e.target.value)} className={fieldClass} placeholder="Captain, member, volunteer" />
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="result">Result</label>
              <input id="result" value={fields.result} onChange={(e) => set('result')(e.target.value)} className={fieldClass} placeholder="1st place, 95%, finalist" />
              {errors.result && <p className="mt-1 text-sm text-red-600">{errors.result}</p>}
            </div>
          </div>
        )}

        {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-ink/20">
            Cancel
          </button>
          <button type="submit" disabled={saving || stillPreparing} className="min-h-12 flex-1 rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
            {saving ? 'Saving…' : stillPreparing ? 'Preparing photo…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
