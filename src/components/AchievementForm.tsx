"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  TITLE_MAX_LENGTH,
  NOTE_MAX_LENGTH,
} from "@/lib/validation";
import { todayAsInputValue, dateToInputValue } from "@/lib/dates";
import type { AchievementJson } from "@/lib/types";

// One form for both adding and editing.
//
// Adding is built around the 10-second goal in REQUIREMENTS.md 1.16: the date
// starts at today, the title is focused as soon as the form opens, and only
// the title and category need a decision.
//
// Passing an `achievement` switches it to edit mode, pre-filled with that
// achievement's values (3.2). Keeping one component means the validation and
// layout can't drift apart between the two.

type FieldErrors = Record<string, string>;

export default function AchievementForm({
  achievement,
  onSaved,
  onCancel,
}: {
  achievement?: AchievementJson;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(achievement);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [noteLength, setNoteLength] = useState(achievement?.note?.length ?? 0);
  // Tracks the "Remove" button on an existing attachment (3.7).
  const [removeFile, setRemoveFile] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Put the cursor in the title box so you can just start typing (1.16).
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    if (removeFile) formData.set("removeFile", "true");

    try {
      const response = await fetch(
        isEditing ? `/api/achievements/${achievement!.id}` : "/api/achievements",
        { method: isEditing ? "PUT" : "POST", body: formData },
      );

      if (!response.ok) {
        const data = await response.json();
        setErrors(
          data.fieldErrors ?? {
            form: data.error ?? "Something went wrong. Please try again.",
          },
        );
        return;
      }

      onSaved();
    } catch {
      setErrors({
        form: "Couldn't reach the app. Check that it's still running and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const formLabel = isEditing ? "Edit achievement" : "Add an achievement";
  const hasExistingFile = Boolean(achievement?.filePath) && !removeFile;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label={formLabel}
    >
      <h2 className="text-lg font-semibold">{formLabel}</h2>

      {errors.form && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errors.form}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            ref={titleRef}
            id="title"
            name="title"
            type="text"
            defaultValue={achievement?.title ?? ""}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            placeholder="What did you do?"
          />
          {errors.title && (
            <p id="title-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium">
              Date <span className="text-red-600">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={
                achievement
                  ? dateToInputValue(achievement.date)
                  : todayAsInputValue()
              }
              max={todayAsInputValue()}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "date-error" : undefined}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            {errors.date && (
              <p id="date-error" role="alert" className="mt-1 text-sm text-red-600">
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              id="category"
              name="category"
              defaultValue={achievement?.category ?? "School"}
              aria-invalid={Boolean(errors.category)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.category}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Note <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={achievement?.note ?? ""}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(event) => setNoteLength(event.target.value.length)}
            aria-invalid={Boolean(errors.note)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            placeholder="Anything worth remembering later"
          />
          <div className="mt-1 flex justify-between">
            {errors.note ? (
              <p role="alert" className="text-sm text-red-600">
                {errors.note}
              </p>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400">
              {noteLength}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            Photo or PDF{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>

          {hasExistingFile && (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <a
                href={`/api/uploads/${achievement!.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-slate-700 underline"
              >
                {achievement!.fileName ?? "Attached file"}
              </a>
              <button
                type="button"
                onClick={() => setRemoveFile(true)}
                className="shrink-0 text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {removeFile && (
            <p className="mt-1 text-sm text-slate-500">
              The attachment will be removed when you save.{" "}
              <button
                type="button"
                onClick={() => setRemoveFile(false)}
                className="text-slate-700 underline"
              >
                Undo
              </button>
            </p>
          )}

          <input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            aria-invalid={Boolean(errors.file)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm"
          />
          {errors.file && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.file}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {hasExistingFile
              ? "Choosing a file replaces the current one. Up to 10 MB."
              : "Images or PDF, up to 10 MB. Stays on your computer."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEditing ? "Save changes" : "Save achievement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
