import { z } from "zod";

// The single source of truth for what a valid achievement looks like.
// Both the server and the browser forms use these rules, so they can
// never drift apart. Rules come from REQUIREMENTS.md.

export const CATEGORIES = [
  "School",
  "Sports",
  "Debate",
  "Cooking",
  "Arts",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TITLE_MAX_LENGTH = 120;
export const NOTE_MAX_LENGTH = 500;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
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

/** Checks an uploaded file. Returns null when the file is fine. */
export function validateFile(file: {
  size: number;
  type: string;
}): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    return "Only images (JPG, PNG, WEBP, GIF) and PDFs can be attached.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "That file is too big. The limit is 10 MB.";
  }
  return null;
}
