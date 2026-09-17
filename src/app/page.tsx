"use client";

import { useCallback, useEffect, useState } from "react";
import AchievementSheet from "@/components/AchievementSheet";
import AchievementCard from "@/components/AchievementCard";
import CameraButton from "@/components/CameraButton";
import TimelineFilters, {
  type CategoryFilter,
} from "@/components/TimelineFilters";
import type { AchievementJson } from "@/lib/types";

// The one screen the app has: your timeline, with a camera button on top.
// REQUIREMENTS.md Features 1 to 4.

export default function HomePage() {
  const [achievements, setAchievements] = useState<AchievementJson[]>([]);
  const [loading, setLoading] = useState(true);

  // What the sheet is doing right now:
  //   null              closed
  //   {}                adding, no photo
  //   { photo }         adding, with a photo just taken
  //   { achievement }   editing an existing one
  const [sheet, setSheet] = useState<
    { photo?: File; achievement?: AchievementJson } | null
  >(null);

  const [category, setCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  // The search box updates instantly, but we only ask the server once typing
  // pauses. Without this every keystroke would fire its own request.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Tracks whether anything has been saved at all, so an empty result from a
  // filter reads differently from a genuinely empty Trophy Case.
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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-30 bg-app-bg/85 px-4 pt-safe pb-3 backdrop-blur-xl">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">
          Trophy Case
        </h1>
        <p className="mt-0.5 text-sm text-app-muted">
          {hasAnyAchievements
            ? `${achievements.length} ${
                achievements.length === 1 ? "achievement" : "achievements"
              }${isFiltering ? " shown" : ""}`
            : "Snap a photo. Save the win."}
        </p>

        <div className="mt-3">
          <TimelineFilters
            category={category}
            search={search}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
          />
        </div>
      </header>

      {/* pb-40 leaves room for the floating camera bar so the last card is
          never hidden behind it. */}
      <main className="flex-1 px-4 pt-2 pb-40">
        {loading ? (
          <p className="py-10 text-center text-sm text-app-muted">Loading…</p>
        ) : achievements.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-app-border px-6 py-12 text-center">
            {isFiltering || hasAnyAchievements ? (
              <>
                <p className="text-4xl" aria-hidden="true">
                  🔍
                </p>
                <p className="mt-3 font-semibold">Nothing matches that</p>
                <p className="mt-1 text-sm text-app-muted">
                  Try a different search, or tap “All” to see everything.
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl" aria-hidden="true">
                  🏆
                </p>
                <p className="mt-3 font-semibold">Your trophy case is empty</p>
                <p className="mt-1 text-sm text-app-muted">
                  Tap the camera button to save your first achievement.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onEdit={() => setSheet({ achievement })}
                onDeleted={() => void loadAchievements()}
              />
            ))}
          </ul>
        )}
      </main>

      {/* The camera bar, pinned to the bottom the way a real app's tab bar is. */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-t from-app-bg via-app-bg/95 to-transparent px-4 pt-8 pb-safe">
          <CameraButton onPhotoChosen={(photo) => setSheet({ photo })} />
          <button
            type="button"
            onClick={() => setSheet({})}
            className="tappable text-sm font-medium text-app-muted"
          >
            Add without a photo
          </button>
        </div>
      </div>

      {sheet && (
        <AchievementSheet
          // Remounts when switching between achievements, so the fields reset
          // to the one being edited rather than keeping stale values.
          key={sheet.achievement?.id ?? "new"}
          achievement={sheet.achievement}
          photo={sheet.photo}
          onSaved={() => {
            setSheet(null);
            void loadAchievements();
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
