import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getUploadsDir } from "@/lib/uploads";
import { ALLOWED_PHOTO_TYPES } from "@/lib/validation";

// Serves a saved photo back to the browser.
//
// Photos live outside /public on purpose: going through this route lets us
// check the filename before reading anything off disk.

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Only ever serve a plain filename from inside the uploads folder. This
  // stops a crafted request like "../../.env.local" from reading other files.
  const safeName = path.basename(filename);
  if (safeName !== filename || safeName.startsWith(".")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(safeName).toLowerCase()];
  if (!contentType || !ALLOWED_PHOTO_TYPES.includes(contentType as never)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(getUploadsDir(), safeName));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        // Private: this is a child's data, so never let a shared cache hold it.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
