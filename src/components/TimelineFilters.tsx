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
      <div className="relative">
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search"
          aria-label="Search achievements"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-2xl bg-surface py-3 pl-11 pr-4 shadow-card ring-1 ring-ink/5 placeholder:text-ink/40"
        />
      </div>
      {/* Scrolls sideways so the chips never wrap and push the list down. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Category filter">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => onCategory(option)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              category === option
                ? 'bg-accent text-white shadow-card'
                : 'bg-surface text-ink/70 ring-1 ring-ink/10 active:bg-ink/5'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
