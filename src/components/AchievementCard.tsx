"use client";

import { useState } from "react";
import { formatDisplayDate } from "@/lib/dates";
import { CATEGORY_EMOJI, type Category } from "@/lib/validation";
import type { AchievementJson } from "@/lib/types";

// One card on the timeline, with its Edit and Delete controls.
// REQUIREMENTS.md Feature 3 and Feature 4.

export default function AchievementCard({
  achievement,
  onEdit,
  onDeleted,
}: {
  achievement: AchievementJson;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  // Confirmation is shown inline rather than with window.confirm, so it can
  // be styled and tested like the rest of the app (4.9).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoUrl = achievement.photoPath
    ? `/api/uploads/${achievement.photoPath}`
    : null;
  const emoji = CATEGORY_EMOJI[achievement.category as Category] ?? "⭐";

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/achievements/${achievement.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Couldn't delete that. Please try again.");
        setDeleting(false);
        return;
      }

      onDeleted();
    } catch {
      setError("Couldn't reach the app. Check that it's still running.");
      setDeleting(false);
    }
  }

  return (
    <li
      data-testid="achievement-item"
      className="overflow-hidden rounded-2xl bg-app-surface shadow-[var(--app-shadow)]"
    >
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noreferrer" className="block">
          {/* A plain <img>: these are local files of unknown size, and
              next/image would want width and height we don't store. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={`Photo for ${achievement.title}`}
            loading="lazy"
            className="h-48 w-full bg-app-surface-2 object-cover"
          />
        </a>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-snug font-semibold">
            {achievement.title}
          </h3>
          <span className="shrink-0 rounded-full bg-app-surface-2 px-2.5 py-1 text-xs font-medium text-app-muted">
            <span aria-hidden="true">{emoji}</span> {achievement.category}
          </span>
        </div>

        <p className="mt-1 text-sm text-app-muted">
          {formatDisplayDate(achievement.date)}
        </p>

        {achievement.note && (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
            {achievement.note}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-app-danger">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 border-t border-app-border pt-3">
          {confirmingDelete ? (
            <>
              <span className="text-sm">Delete this?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="tappable text-sm font-semibold text-app-danger disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="tappable text-sm text-app-muted disabled:opacity-50"
              >
                Keep it
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${achievement.title}`}
                className="tappable text-sm font-medium text-app-muted"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${achievement.title}`}
                className="tappable text-sm font-medium text-app-muted"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
