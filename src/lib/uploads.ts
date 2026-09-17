import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { validateFile } from "@/lib/validation";

// Saves uploaded photos and PDFs. Files stay on this machine and are never
// sent anywhere — see PRIVACY.md.
//
// Where they go depends on UPLOADS_DIR:
//   unset  -> <project>/uploads, which is what `npm run dev` uses
//   set    -> that folder, which is how the live site keeps its uploads in
//             ~/TrophyCaseLive/uploads, away from the personal copy
//
// This is a FUNCTION, not a constant. A constant would freeze the path when
// this module first loaded, which would let the live and local copies end up
// sharing one folder depending on load order (REQUIREMENTS-v3.md T3.18).

export function getUploadsDir(): string {
  const configured = process.env.UPLOADS_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "uploads");
}

/** Thrown when an uploaded file breaks the rules in validation.ts. */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

/** Picks a file extension from the browser-reported type. */
function extensionFor(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? "";
}

/**
 * Strips any folder parts from a browser-supplied filename.
 *
 * We only ever show this name back to the user — the stored name is a
 * generated one — but sanitising it keeps a crafted name like
 * "../../etc/passwd" from ever being treated as a path.
 */
function safeDisplayName(name: string): string {
  return path.basename(name).replace(/[\r\n]/g, "").slice(0, 255) || "file";
}

export type SavedFile = {
  filePath: string; // generated name, relative to the uploads folder
  fileName: string; // the original name, for display
  fileType: string;
};

/**
 * Saves an uploaded file and returns what to store in the database.
 *
 * The file is given a random generated name so that two uploads called
 * "certificate.jpg" can't overwrite each other, and so a user-supplied
 * name can never steer where the file lands.
 */
export async function saveUploadedFile(file: File): Promise<SavedFile> {
  const problem = validateFile({ size: file.size, type: file.type });
  if (problem) {
    throw new FileValidationError(problem);
  }

  await mkdir(getUploadsDir(), { recursive: true });

  const storedName = `${randomUUID()}${extensionFor(file.type)}`;
  const destination = path.join(getUploadsDir(), storedName);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, bytes);

  return {
    filePath: storedName,
    fileName: safeDisplayName(file.name),
    fileType: file.type,
  };
}

/**
 * Deletes a stored file. Never throws — a missing file is fine, since the
 * database record is what matters and we don't want cleanup to break a
 * delete or an edit.
 */
export async function deleteStoredFile(filePath: string | null): Promise<void> {
  if (!filePath) return;

  // Defence in depth: only ever delete a plain filename inside uploads/.
  const storedName = path.basename(filePath);
  if (storedName !== filePath) return;

  try {
    await unlink(path.join(getUploadsDir(), storedName));
  } catch {
    // Already gone, or never written. Nothing to do.
  }
}
