"use client";

import { useState } from "react";
import { formatDisplayDate } from "@/lib/dates";
import type { AchievementJson } from "@/lib/types";

// One row on the timeline, with its Edit and Delete controls.
// REQUIREMENTS.md 2.4 to 2.6 and 3.1, 3.8 to 3.11.

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
  // be styled and tested like the rest of the app (3.9).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = achievement.fileType?.startsWith("image/");
  const isPdf = achievement.fileType === "application/pdf";
  const fileUrl = achievement.filePath
    ? `/api/uploads/${achievement.filePath}`
    : null;

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
        <p className="mt-2 text-sm whitespace-pre-line text-slate-700">
          {achievement.note}
        </p>
      )}

      {fileUrl && isImage && (
        <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-3 block">
          {/* A plain <img>: these are local files of unknown size, and
              next/image would want width and height we don't store. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={achievement.fileName ?? "Attached photo"}
            className="max-h-48 rounded-lg border border-slate-200 object-cover"
          />
        </a>
      )}

      {fileUrl && isPdf && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <span aria-hidden="true">📄</span>
          {achievement.fileName ?? "View PDF"}
        </a>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-slate-700">Delete this?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="text-sm text-slate-600 hover:underline disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${achievement.title}`}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${achievement.title}`}
              className="text-sm text-slate-600 hover:text-red-600 hover:underline"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
