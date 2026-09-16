"use client";

import { useCallback, useEffect, useState } from "react";
import AchievementForm from "@/components/AchievementForm";
import { formatDisplayDate } from "@/lib/dates";

// The home page. Right now it shows the add form and a simple list of what
// you've saved. Filtering, search and the richer timeline arrive in Feature 2.

type Achievement = {
  id: string;
  title: string;
  date: string;
  category: string;
  note: string | null;
  fileName: string | null;
  fileType: string | null;
  filePath: string | null;
};

export default function HomePage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadAchievements = useCallback(async () => {
    const response = await fetch("/api/achievements");
    const data = await response.json();
    setAchievements(data.achievements ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

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

      <section className="mt-8">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : achievements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-medium">No achievements yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Click “Add achievement” to save your first one.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {achievements.map((achievement) => (
              <li
                key={achievement.id}
                data-testid="achievement-item"
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{achievement.title}</h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {achievement.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDisplayDate(achievement.date)}
                </p>
                {achievement.note && (
                  <p className="mt-2 text-sm text-slate-700">{achievement.note}</p>
                )}
                {achievement.filePath && (
                  <p className="mt-2 text-sm">
                    <a
                      href={`/api/uploads/${achievement.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-600 underline hover:text-slate-900"
                    >
                      {achievement.fileName}
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
