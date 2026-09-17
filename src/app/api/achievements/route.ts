import { NextResponse } from "next/server";
import {
  createAchievement,
  listAchievements,
  ValidationError,
} from "@/lib/achievements";
import { savePhoto, PhotoValidationError } from "@/lib/uploads";
import type { Category } from "@/lib/validation";
import { inputValueToDate } from "@/lib/dates";

// Thin route: read the request, call into src/lib, return the result.
// The logic lives in src/lib/achievements.ts so it can be unit-tested.

/** GET /api/achievements — the timeline, with optional filter and search. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const achievements = await listAchievements({
    category: (searchParams.get("category") as Category | "All") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ achievements });
}

/** POST /api/achievements — save a new achievement. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const rawDate = String(formData.get("date") ?? "");
    const photo = formData.get("photo");

    // Save the photo first so a failed upload doesn't leave a half-made record.
    let savedPhoto = null;
    if (photo instanceof File && photo.size > 0) {
      savedPhoto = await savePhoto(photo);
    }

    const achievement = await createAchievement(
      {
        title: String(formData.get("title") ?? ""),
        // A date input gives "2025-03-14"; inputValueToDate pins it to
        // midday UTC so no timezone can shift which day it lands on.
        date: rawDate ? inputValueToDate(rawDate) : new Date(Number.NaN),
        category: String(formData.get("category") ?? ""),
        note: String(formData.get("note") ?? ""),
      },
      savedPhoto,
    );

    return NextResponse.json({ achievement }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof PhotoValidationError) {
      return NextResponse.json(
        { error: error.message, fieldErrors: { photo: error.message } },
        { status: 400 },
      );
    }

    console.error("Failed to create achievement:", error);
    return NextResponse.json(
      { error: "Something went wrong saving that. Please try again." },
      { status: 500 },
    );
  }
}
