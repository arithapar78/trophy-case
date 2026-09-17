import { NextResponse } from "next/server";
import {
  getAchievement,
  updateAchievement,
  deleteAchievement,
  ValidationError,
  NotFoundError,
} from "@/lib/achievements";
import {
  savePhoto,
  deleteStoredPhoto,
  PhotoValidationError,
} from "@/lib/uploads";
import { inputValueToDate } from "@/lib/dates";

// Edit and delete a single achievement. REQUIREMENTS.md Feature 4.

/** Shared error handling so both handlers answer the same way. */
function errorResponse(error: unknown) {
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: "That achievement no longer exists. Try refreshing the page." },
      { status: 404 },
    );
  }
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

  console.error("Achievement request failed:", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

/** GET /api/achievements/[id] — one achievement. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const achievement = await getAchievement(id);

  if (!achievement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ achievement });
}

/** PUT /api/achievements/[id] — save an edit. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const existing = await getAchievement(id);
    if (!existing) throw new NotFoundError(id);

    const formData = await request.formData();
    const rawDate = String(formData.get("date") ?? "");
    const photo = formData.get("photo");
    // The form sends this when the user taps "Remove" on a photo.
    const removePhoto = formData.get("removePhoto") === "true";

    // undefined means "leave the photo alone"; null means "remove it".
    let photoUpdate: Awaited<ReturnType<typeof savePhoto>> | null | undefined;

    if (photo instanceof File && photo.size > 0) {
      photoUpdate = await savePhoto(photo);
    } else if (removePhoto) {
      photoUpdate = null;
    }

    const achievement = await updateAchievement(
      id,
      {
        title: String(formData.get("title") ?? ""),
        date: rawDate ? inputValueToDate(rawDate) : new Date(Number.NaN),
        category: String(formData.get("category") ?? ""),
        note: String(formData.get("note") ?? ""),
      },
      photoUpdate,
    );

    // The database write succeeded, so the old photo is now unreferenced.
    // Deleting it afterwards means a failed edit never destroys a photo that
    // the surviving record still points at.
    if (photoUpdate !== undefined && existing.photoPath) {
      await deleteStoredPhoto(existing.photoPath);
    }

    return NextResponse.json({ achievement });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/achievements/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const deleted = await deleteAchievement(id);

    // Take the photo with it, so /uploads doesn't fill with orphans.
    await deleteStoredPhoto(deleted.photoPath);

    return NextResponse.json({ deleted: { id: deleted.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
