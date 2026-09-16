"use client";

import { CATEGORIES } from "@/lib/validation";

// The category filter and search box above the timeline.
// REQUIREMENTS.md 2.7 to 2.13.

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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
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
                  ? "rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
