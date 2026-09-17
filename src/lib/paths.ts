// Where the app keeps its data.

/** Where photos go. Set by UPLOADS_DIR. */
export { getUploadsDir } from "@/lib/uploads";

/**
 * The database connection string. Set by DATABASE_URL.
 *
 * Kept here so src/lib/db.ts and prisma.config.ts agree on the default
 * instead of each writing their own.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
}
