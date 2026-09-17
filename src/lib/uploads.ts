import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { validatePhoto } from "@/lib/validation";

// Saves photos taken with the camera or picked from the camera roll.
// Photos stay on this machine and are never sent anywhere — see PRIVACY.md.
//
// Where they go depends on UPLOADS_DIR; unset means <project>/uploads, which
// is what `npm run dev` uses. This is a FUNCTION, not a constant, so the
// path is read when it's used rather than frozen when the module loaded.

export function getUploadsDir(): string {
  const configured = process.env.UPLOADS_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "uploads");
}

/** Thrown when a photo breaks the rules in validation.ts. */
export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoValidationError";
  }
}

/** Picks a file extension from the browser-reported type. */
function extensionFor(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };
  return map[mimeType] ?? "";
}

export type SavedPhoto = {
  photoPath: string; // generated name, relative to the uploads folder
  photoType: string;
};

/**
 * Saves a photo and returns what to store in the database.
 *
 * The photo gets a random generated name so two uploads from the same camera
 * can't overwrite each other, and so a name supplied by the browser can never
 * steer where the file lands.
 */
export async function savePhoto(photo: File): Promise<SavedPhoto> {
  const problem = validatePhoto({ size: photo.size, type: photo.type });
  if (problem) {
    throw new PhotoValidationError(problem);
  }

  await mkdir(getUploadsDir(), { recursive: true });

  const storedName = `${randomUUID()}${extensionFor(photo.type)}`;
  const destination = path.join(getUploadsDir(), storedName);

  const bytes = Buffer.from(await photo.arrayBuffer());
  await writeFile(destination, bytes);

  return { photoPath: storedName, photoType: photo.type };
}

/**
 * Deletes a stored photo. Never throws — a missing file is fine, since the
 * database record is what matters and we don't want cleanup to break a
 * delete or an edit.
 */
export async function deleteStoredPhoto(photoPath: string | null): Promise<void> {
  if (!photoPath) return;

  // Defence in depth: only ever delete a plain filename inside uploads/.
  const storedName = path.basename(photoPath);
  if (storedName !== photoPath) return;

  try {
    await unlink(path.join(getUploadsDir(), storedName));
  } catch {
    // Already gone, or never written. Nothing to do.
  }
}
