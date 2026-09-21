import { CATEGORIES } from '../lib/types'

interface Props {
  search: string
  category: string
  onSearch: (value: string) => void
  onCategory: (value: string) => void
}

const OPTIONS = ['All', ...CATEGORIES]

export default function TimelineFilters({ search, category, onSearch, onCategory }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search"
        aria-label="Search achievements"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3"
      />
      {/* Scrolls sideways so the chips never wrap and push the list down. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Category filter">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => onCategory(option)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
              category === option ? 'border-accent bg-accent text-white' : 'border-ink/20'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
