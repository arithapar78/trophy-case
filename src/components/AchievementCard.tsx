"use client";

import { formatDisplayDate } from "@/lib/dates";
import type { AchievementJson } from "@/lib/types";

// One row on the timeline. REQUIREMENTS.md 2.4 to 2.6.

export default function AchievementCard({
  achievement,
}: {
  achievement: AchievementJson;
}) {
  const isImage = achievement.fileType?.startsWith("image/");
  const isPdf = achievement.fileType === "application/pdf";
  const fileUrl = achievement.filePath
    ? `/api/uploads/${achievement.filePath}`
    : null;

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
    </li>
  );
}
