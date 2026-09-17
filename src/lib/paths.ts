import path from "node:path";

// Where the app keeps its data.
//
// Each of these is a FUNCTION, not a constant, so the path is read when it's
// used rather than frozen when the module first loaded. That matters because
// the live site and the personal local copy run from the same code with
// different environment variables (REQUIREMENTS-v3.md criteria 1.8 to 1.10).
//
// Defaults are today's local paths, so `npm run dev` works with no env file
// at all (criterion 1.9).

/** Where uploaded photos and PDFs go. Set by UPLOADS_DIR. */
export { getUploadsDir } from "@/lib/uploads";

/** Where database backups go. Set by BACKUPS_DIR. */
export function getBackupsDir(): string {
  const configured = process.env.BACKUPS_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "backups");
}

/**
 * The database connection string. Set by DATABASE_URL.
 *
 * Kept here so src/lib/db.ts, prisma.config.ts and the start script all
 * agree on the default instead of each writing their own.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
}

/** True when running the live production build. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
