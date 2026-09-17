import { NextResponse } from "next/server";
import {
  getSettings,
  setPlan,
  getPromptLimit,
  advanceClock,
  resetClock,
  isPlan,
} from "@/lib/settings";

// GET and PUT the app settings. The plan lives here, on the server, so the
// browser can't grant itself Pro (criterion 1.9, N2.2).

export async function GET() {
  const settings = await getSettings();

  return NextResponse.json({
    plan: settings.plan,
    promptLimit: await getPromptLimit(),
    clockOffsetMs: settings.clockOffsetMs,
    // The dev clock controls are hidden in production.
    devToolsAvailable: process.env.NODE_ENV !== "production",
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Plan change. The Free/Pro switch is a TEST control, so the live site
    // refuses it entirely — everyone online is on Free (criteria 1.27, 1.28).
    // Without this, one request would grant a stranger the higher prompt
    // limit on the owner's API key.
    if ("plan" in body) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "The plan can't be changed here." },
          { status: 403 },
        );
      }
      if (!isPlan(body.plan)) {
        return NextResponse.json(
          { error: "Plan must be either Free or Pro." },
          { status: 400 },
        );
      }

      const settings = await setPlan(body.plan);
      return NextResponse.json({
        plan: settings.plan,
        promptLimit: await getPromptLimit(),
        clockOffsetMs: settings.clockOffsetMs,
      });
    }

    // Dev-only clock controls.
    if ("advanceClockMs" in body || "resetClock" in body) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "The clock can't be changed in production." },
          { status: 403 },
        );
      }

      const settings = body.resetClock
        ? await resetClock()
        : await advanceClock(Number(body.advanceClockMs) || 0);

      return NextResponse.json({
        plan: settings.plan,
        promptLimit: await getPromptLimit(),
        clockOffsetMs: settings.clockOffsetMs,
      });
    }

    return NextResponse.json(
      { error: "Nothing to change." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Settings update failed:", error);
    return NextResponse.json(
      { error: "Couldn't save that. Please try again." },
      { status: 500 },
    );
  }
}
