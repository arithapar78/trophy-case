import { useState } from 'react'
import { addCategory, CategoryError } from '../lib/categories'

interface Props {
  categories: string[]
  value: string
  onChange: (category: string) => void
  // Called after a new category is saved, so the app can reload its list.
  onCategoryAdded: (category: string) => void
}

// The category chips in the details sheet, plus "+ New category" at the
// end. The chips wrap rather than scroll sideways, so the "+ New" chip is
// always on screen instead of hidden past the edge.
export default function CategoryPicker({ categories, value, onChange, onCategoryAdded }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError(undefined)
    try {
      const added = await addCategory(name)
      setAdding(false)
      setName('')
      onCategoryAdded(added)
      onChange(added)
    } catch (err) {
      setError(err instanceof CategoryError ? err.message : "Couldn't add that category. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const chip = 'rounded-full px-4 py-2 text-sm font-medium transition-colors'

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={`${chip} ${
              value === c ? 'bg-accent text-white shadow-card' : 'bg-ink/[0.04] text-ink/70 ring-1 ring-ink/10 active:bg-ink/10'
            }`}
          >
            {c}
          </button>
        ))}
        {!adding && (
          <button
            type="button"
            data-testid="new-category"
            onClick={() => setAdding(true)}
            className={`${chip} border border-dashed border-ink/25 text-accent-ink active:bg-ink/5`}
          >
            + New category
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            aria-label="New category name"
            data-testid="new-category-name"
            value={name}
            autoFocus
            maxLength={40}
            placeholder="Like Debate or Robotics"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              }
            }}
            className="min-w-0 flex-1 rounded-2xl bg-ink/[0.04] px-4 py-3 ring-1 ring-ink/10"
          />
          <button
            type="button"
            data-testid="new-category-save"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
            className="min-h-12 rounded-2xl bg-accent px-4 font-semibold text-white disabled:bg-ink/10 disabled:text-ink/40"
          >
            Add
          </button>
          <button
            type="button"
            aria-label="Cancel new category"
            onClick={() => {
              setAdding(false)
              setName('')
              setError(undefined)
            }}
            className="min-h-12 rounded-2xl px-3 text-sm text-ink/60 ring-1 ring-ink/10"
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
