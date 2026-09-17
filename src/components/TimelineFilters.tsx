"use client";

import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/validation";

// The search box and the row of category chips above the timeline.
// REQUIREMENTS.md Feature 3.

export type CategoryFilter = (typeof CATEGORIES)[number] | "All";

export default function TimelineFilters({
  category,
  search,
  onCategoryChange,
  onSearchChange,
}: {
  category: CategoryFilter;
  search: string;
  onCategoryChange: (category: CategoryFilter) => void;
  onSearchChange: (search: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="search" className="sr-only">
          Search achievements
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search your achievements"
          /* text-base is deliberate: at anything smaller iOS zooms the page
             in when the box is focused. */
          className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-base outline-none focus:border-app-accent"
        />
      </div>

      {/* Scrolls sideways on a narrow phone instead of wrapping to two rows
          and pushing the timeline down. */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        {(["All", ...CATEGORIES] as CategoryFilter[]).map((option) => {
          const isActive = option === category;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onCategoryChange(option)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "tappable shrink-0 rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-text"
                  : "tappable shrink-0 rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm text-app-muted"
              }
            >
              {option !== "All" && (
                <span aria-hidden="true">{CATEGORY_EMOJI[option]} </span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
