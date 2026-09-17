"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  TITLE_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  type Category,
} from "@/lib/validation";
import { todayAsInputValue, dateToInputValue } from "@/lib/dates";
import type { AchievementJson } from "@/lib/types";

// The sheet that slides up from the bottom to collect the details.
//
// One sheet does both jobs: adding (with or without a photo) and editing.
// Keeping it as one component means the validation and layout can't drift
// apart between the two.
//
// The whole design is built around the 10-second goal in REQUIREMENTS.md 2.9:
// the date starts at today, the title is focused the moment the sheet opens,
// and the category is one tap on a chip rather than a dropdown.

type FieldErrors = Record<string, string>;

export default function AchievementSheet({
  achievement,
  photo,
  onSaved,
  onClose,
}: {
  /** Passed when editing an existing achievement. */
  achievement?: AchievementJson;
  /** A photo just taken with the camera, for a new achievement. */
  photo?: File;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEditing = Boolean(achievement);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [note, setNote] = useState(achievement?.note ?? "");
  const [category, setCategory] = useState<Category>(
    (achievement?.category as Category) ?? "School",
  );
  // Tracks the "Remove" button on an existing photo.
  const [removePhoto, setRemovePhoto] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // A local preview of the just-taken photo, so you can see what you shot
  // while you type. Revoked on unmount so the browser can free the memory.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Put the cursor in the title box so you can just start typing.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Escape closes the sheet, the way a real dialog does.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    formData.set("category", category);
    if (photo) formData.set("photo", photo);
    if (removePhoto) formData.set("removePhoto", "true");

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

  const existingPhotoUrl =
    achievement?.photoPath && !removePhoto
      ? `/api/uploads/${achievement.photoPath}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Tapping the dimmed area behind the sheet closes it. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/50"
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label={isEditing ? "Edit achievement" : "New achievement"}
        className="animate-sheet-up relative max-h-[92vh] overflow-y-auto rounded-t-3xl bg-app-surface pb-safe shadow-2xl"
      >
        {/* The little grab handle that says "this slides". */}
        <div className="sticky top-0 z-10 flex justify-center bg-app-surface pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-app-border" />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center justify-between gap-3 pt-1 pb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Edit achievement" : "New achievement"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="tappable text-base text-app-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {errors.form && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-app-danger"
            >
              {errors.form}
            </p>
          )}

          {/* The photo you just took, or the one already saved. */}
          {(previewUrl || existingPhotoUrl) && (
            <div className="relative mb-4 overflow-hidden rounded-2xl bg-app-surface-2">
              {/* A plain <img>: these are local files of unknown size, and
                  next/image would want width and height we don't store. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl ?? existingPhotoUrl!}
                alt="The photo for this achievement"
                className="max-h-56 w-full object-cover"
              />
              {existingPhotoUrl && !photo && (
                <button
                  type="button"
                  onClick={() => setRemovePhoto(true)}
                  className="tappable absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Remove
                </button>
              )}
            </div>
          )}

          {removePhoto && (
            <p className="mb-4 text-sm text-app-muted">
              The photo will be removed when you save.{" "}
              <button
                type="button"
                onClick={() => setRemovePhoto(false)}
                className="font-medium underline"
              >
                Undo
              </button>
            </p>
          )}

          {errors.photo && (
            <p role="alert" className="mb-4 text-sm text-app-danger">
              {errors.photo}
            </p>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
                What did you do?
              </label>
              <input
                ref={titleRef}
                id="title"
                name="title"
                type="text"
                enterKeyHint="done"
                defaultValue={achievement?.title ?? ""}
                maxLength={TITLE_MAX_LENGTH}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                placeholder="Won the regional science fair"
                /* text-base is deliberate: at anything smaller iOS zooms the
                   page in when the box is focused. */
                className="w-full rounded-xl border border-app-border bg-app-surface-2 px-4 py-3 text-base outline-none focus:border-app-accent"
              />
              {errors.title && (
                <p id="title-error" role="alert" className="mt-1.5 text-sm text-app-danger">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium">Category</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
                {CATEGORIES.map((option) => {
                  const isActive = option === category;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      aria-pressed={isActive}
                      className={
                        isActive
                          ? "tappable rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-text"
                          : "tappable rounded-full border border-app-border bg-app-surface-2 px-4 py-2 text-sm text-app-muted"
                      }
                    >
                      <span aria-hidden="true">{CATEGORY_EMOJI[option]}</span> {option}
                    </button>
                  );
                })}
              </div>
              {errors.category && (
                <p role="alert" className="mt-1.5 text-sm text-app-danger">
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
                When
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={
                  achievement ? dateToInputValue(achievement.date) : todayAsInputValue()
                }
                max={todayAsInputValue()}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "date-error" : undefined}
                className="w-full rounded-xl border border-app-border bg-app-surface-2 px-4 py-3 text-base outline-none focus:border-app-accent"
              />
              {errors.date && (
                <p id="date-error" role="alert" className="mt-1.5 text-sm text-app-danger">
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="note" className="mb-1.5 block text-sm font-medium">
                Note{" "}
                <span className="font-normal text-app-muted">(optional)</span>
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                aria-invalid={Boolean(errors.note)}
                placeholder="Anything worth remembering later"
                className="w-full resize-none rounded-xl border border-app-border bg-app-surface-2 px-4 py-3 text-base outline-none focus:border-app-accent"
              />
              <div className="mt-1.5 flex justify-between">
                {errors.note ? (
                  <p role="alert" className="text-sm text-app-danger">
                    {errors.note}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-app-muted">
                  {note.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="tappable mt-6 w-full rounded-2xl bg-app-accent py-4 text-base font-semibold text-app-accent-text disabled:opacity-50"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add to timeline"}
          </button>
        </div>
      </form>
    </div>
  );
}
