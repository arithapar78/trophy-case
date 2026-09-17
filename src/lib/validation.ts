import { z } from "zod";

// The single source of truth for what a valid achievement looks like.
// Both the server and the browser form use these rules, so they can never
// drift apart. Rules come from REQUIREMENTS.md.

export const CATEGORIES = [
  "School",
  "Sports",
  "Debate",
  "Cooking",
  "Arts",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The emoji shown on each category chip and card. */
export const CATEGORY_EMOJI: Record<Category, string> = {
  School: "🎓",
  Sports: "⚽",
  Debate: "🎤",
  Cooking: "🍳",
  Arts: "🎨",
  Other: "⭐",
};

export const TITLE_MAX_LENGTH = 120;
export const NOTE_MAX_LENGTH = 500;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Photos only. A phone camera produces JPEG or HEIC; Safari converts HEIC to
// JPEG on upload, so the list below covers every photo this app will see.
export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/**
 * The last moment of today in local time.
 *
 * A date counts as "in the future" only if it lands after today, so an
 * achievement saved today is always allowed no matter the time of day.
 */
export function endOfToday(now: Date = new Date()): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

export const achievementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please add a title.")
    .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`),

  date: z
    .date({ message: "Please choose a valid date." })
    .refine((value) => value <= endOfToday(), {
      message: "The date can't be in the future.",
    }),

  category: z.enum(CATEGORIES, {
    message: "Please choose a category.",
  }),

  note: z
    .string()
    .trim()
    .max(NOTE_MAX_LENGTH, `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`)
    .optional()
    .or(z.literal("")),
});

export type AchievementInput = z.infer<typeof achievementSchema>;

/** Checks an uploaded photo. Returns null when the photo is fine. */
export function validatePhoto(photo: {
  size: number;
  type: string;
}): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(photo.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return "That file isn't a photo. Use a JPG, PNG, WEBP or HEIC image.";
  }
  if (photo.size > MAX_PHOTO_SIZE_BYTES) {
    return "That photo is too big. The limit is 10 MB.";
  }
  return null;
}
