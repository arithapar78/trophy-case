import { db } from "@/lib/db";
import {
  achievementSchema,
  type Category,
  type AchievementInput,
} from "@/lib/validation";

// All the achievement logic lives here, separate from the API routes, so it
// can be tested without a browser or a running server. See CLAUDE.md.

export type Achievement = {
  id: string;
  title: string;
  date: Date;
  category: string;
  note: string | null;
  photoPath: string | null;
  photoType: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Details of a saved photo, or null for no photo. */
export type PhotoInput = {
  photoPath: string;
  photoType: string;
} | null;

/** Thrown when input fails the rules in validation.ts. */
export class ValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? "That doesn't look right.");
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/** Thrown when an achievement id doesn't match anything. */
export class NotFoundError extends Error {
  constructor(id: string) {
    super(`No achievement found with id "${id}".`);
    this.name = "NotFoundError";
  }
}

/**
 * Runs input through the shared rules and returns clean values.
 * Throws ValidationError, with one message per bad field, if anything fails.
 */
function parseInput(input: unknown): AchievementInput {
  const result = achievementSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "form");
      // Keep the first message per field; it's the most specific.
      fieldErrors[field] ??= issue.message;
    }
    throw new ValidationError(fieldErrors);
  }

  return result.data;
}

/** Saves a new achievement. */
export async function createAchievement(
  input: unknown,
  photo: PhotoInput = null,
): Promise<Achievement> {
  const data = parseInput(input);

  return db.achievement.create({
    data: {
      title: data.title,
      date: data.date,
      category: data.category,
      note: data.note ? data.note : null,
      photoPath: photo?.photoPath ?? null,
      photoType: photo?.photoType ?? null,
    },
  });
}

/**
 * Updates an existing achievement.
 *
 * `photo` controls the attached photo:
 *   undefined  leave whatever is there alone
 *   null       remove the photo
 *   an object  replace it with this one
 */
export async function updateAchievement(
  id: string,
  input: unknown,
  photo?: PhotoInput,
): Promise<Achievement> {
  const existing = await db.achievement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(id);
  }

  // Validate before writing, so a bad edit leaves the original untouched.
  const data = parseInput(input);

  const photoFields =
    photo === undefined
      ? {}
      : {
          photoPath: photo?.photoPath ?? null,
          photoType: photo?.photoType ?? null,
        };

  return db.achievement.update({
    where: { id },
    data: {
      title: data.title,
      date: data.date,
      category: data.category,
      note: data.note ? data.note : null,
      ...photoFields,
    },
  });
}

/** Deletes an achievement. Returns the deleted record. */
export async function deleteAchievement(id: string): Promise<Achievement> {
  const existing = await db.achievement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(id);
  }

  return db.achievement.delete({ where: { id } });
}

/** Fetches one achievement, or null if it doesn't exist. */
export async function getAchievement(id: string): Promise<Achievement | null> {
  return db.achievement.findUnique({ where: { id } });
}

export type ListOptions = {
  /** Show only this category. "All" or undefined means every category. */
  category?: Category | "All";
  /** Match against title and note, ignoring capitalization. */
  search?: string;
};

/**
 * The timeline: achievements newest first, optionally filtered and searched.
 *
 * Ties on the same date are broken by which was created more recently,
 * so the order is stable (REQUIREMENTS.md 3.3).
 */
export async function listAchievements(
  options: ListOptions = {},
): Promise<Achievement[]> {
  const { category, search } = options;

  const where: {
    category?: string;
    OR?: Array<{ title?: object; note?: object }>;
  } = {};

  if (category && category !== "All") {
    where.category = category;
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // SQLite's LIKE ignores case for plain A-Z text, which covers
    // REQUIREMENTS.md 3.11. Verified limitation: it does NOT fold accented
    // letters, so searching "CAFÉ" won't match "Café" (lowercase "café"
    // does). Fixing that needs a stored lowercased copy of each field,
    // which isn't worth the complexity for the MVP.
    where.OR = [
      { title: { contains: trimmedSearch } },
      { note: { contains: trimmedSearch } },
    ];
  }

  return db.achievement.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}
