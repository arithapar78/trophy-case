import { useState } from 'react'
import { addCategory, CategoryError, countInCategory, deleteCategory, renameCategory } from '../lib/categories'
import { MAX_CUSTOM_CATEGORIES } from '../lib/types'

interface Props {
  // Only the user's own. The starter ones cannot be changed.
  custom: string[]
  onChanged: () => void
}

type Editing = { kind: 'rename'; name: string; value: string } | { kind: 'delete'; name: string; count: number }

// "Your categories" in Settings: add, rename or delete the ones you made.
// Renaming moves every achievement with it; deleting moves them to Other.
export default function CategoriesSection({ custom, onChanged }: Props) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<Editing>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(undefined)
    try {
      await work()
      onChanged()
    } catch (err) {
      setError(err instanceof CategoryError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'min-w-0 flex-1 rounded-2xl bg-ink/[0.04] px-4 py-3 ring-1 ring-ink/10'
  const small = 'min-h-11 rounded-2xl px-3 text-sm font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5 disabled:opacity-40'

  return (
    <section className="mt-5" data-testid="categories-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Your categories</h3>
      <p className="mt-1 text-sm opacity-70">
        Everyone gets School, Sports, Arts, Community Service, Work, Clubs &amp; Leadership, Awards and Other. Add your own for
        anything more specific. Up to {MAX_CUSTOM_CATEGORIES}.
      </p>

      {custom.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {custom.map((name) => (
            <li key={name} className="rounded-2xl p-3 ring-1 ring-ink/10" data-testid="custom-category">
              {editing?.name === name && editing.kind === 'rename' ? (
                <div className="flex gap-2">
                  <input
                    aria-label={`New name for ${name}`}
                    data-testid="rename-category-input"
                    value={editing.value}
                    autoFocus
                    maxLength={40}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className={input}
                  />
                  <button
                    type="button"
                    data-testid="rename-category-save"
                    disabled={busy}
                    className={`${small} bg-accent text-white ring-0`}
                    onClick={() =>
                      void run(async () => {
                        await renameCategory(name, editing.value)
                        setEditing(undefined)
                      })
                    }
                  >
                    Save
                  </button>
                  <button type="button" className={small} onClick={() => setEditing(undefined)}>
                    Cancel
                  </button>
                </div>
              ) : editing?.name === name && editing.kind === 'delete' ? (
                <div>
                  <p className="text-sm" data-testid="delete-category-message">
                    Delete "{name}"?{' '}
                    {editing.count === 0
                      ? 'Nothing is in it.'
                      : `${editing.count} achievement${editing.count === 1 ? '' : 's'} will move to Other. Nothing is deleted but the name.`}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className={`${small} flex-1`} onClick={() => setEditing(undefined)}>
                      Keep it
                    </button>
                    <button
                      type="button"
                      data-testid="delete-category-confirm"
                      disabled={busy}
                      className={`${small} flex-1 bg-red-600 text-white ring-0`}
                      onClick={() =>
                        void run(async () => {
                          await deleteCategory(name)
                          setEditing(undefined)
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-medium">{name}</span>
                  <button
                    type="button"
                    aria-label={`Rename ${name}`}
                    className={small}
                    onClick={() => {
                      setError(undefined)
                      setEditing({ kind: 'rename', name, value: name })
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${name}`}
                    className={`${small} text-red-600`}
                    onClick={() =>
                      void countInCategory(name).then((count) => {
                        setError(undefined)
                        setEditing({ kind: 'delete', name, count })
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {custom.length < MAX_CUSTOM_CATEGORIES && (
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Add a category"
            data-testid="settings-new-category"
            value={newName}
            maxLength={40}
            placeholder="Like Debate or Robotics"
            onChange={(e) => setNewName(e.target.value)}
            className={input}
          />
          <button
            type="button"
            data-testid="settings-add-category"
            disabled={busy || !newName.trim()}
            className="min-h-12 rounded-2xl bg-accent px-4 font-semibold text-white disabled:bg-ink/10 disabled:text-ink/40"
            onClick={() =>
              void run(async () => {
                await addCategory(newName)
                setNewName('')
              })
            }
          >
            Add
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
