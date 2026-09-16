"use client";

import { useCallback, useEffect, useState } from "react";
import AchievementForm from "@/components/AchievementForm";
import AchievementCard from "@/components/AchievementCard";
import TimelineFilters, {
  type CategoryFilter,
} from "@/components/TimelineFilters";
import type { AchievementJson } from "@/lib/types";

// The timeline. REQUIREMENTS.md Feature 2.

export default function HomePage() {
  const [achievements, setAchievements] = useState<AchievementJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  // The search box updates instantly, but we only ask the server once typing
  // pauses. Without this every keystroke would fire its own request.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Tracks whether anything has been saved at all, so an empty result from a
  // filter reads differently from a genuinely empty Trophy Case (2.14, 2.15).
  const [hasAnyAchievements, setHasAnyAchievements] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAchievements = useCallback(async () => {
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const response = await fetch(`/api/achievements?${params}`);
    const data = await response.json();
    const results: AchievementJson[] = data.achievements ?? [];

    setAchievements(results);
    // An unfiltered load tells us whether the Trophy Case has anything in it.
    if (category === "All" && !debouncedSearch.trim()) {
      setHasAnyAchievements(results.length > 0);
    } else if (results.length > 0) {
      setHasAnyAchievements(true);
    }
    setLoading(false);
  }, [category, debouncedSearch]);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const isFiltering = category !== "All" || debouncedSearch.trim().length > 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trophy Case</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your personal achievement timeline.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add achievement
          </button>
        )}
      </header>

      {showForm && (
        <div className="mt-6">
          <AchievementForm
            onSaved={() => {
              setShowForm(false);
              void loadAchievements();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-8">
        <TimelineFilters
          category={category}
          search={search}
          onCategoryChange={setCategory}
          onSearchChange={setSearch}
        />
      </div>

      <section className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : achievements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            {isFiltering || hasAnyAchievements ? (
              <>
                <p className="font-medium">Nothing matches that</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different search, or choose “All” to see everything.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">No achievements yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Click “Add achievement” to save your first one.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {achievements.length}{" "}
              {achievements.length === 1 ? "achievement" : "achievements"}
            </p>
            <ul className="space-y-3">
              {achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
