import { NextResponse } from "next/server";
import { listAchievements } from "@/lib/achievements";
import {
  generateEssayIdeas,
  NoAchievementsError,
  EssayIdeasError,
} from "@/lib/essay-ideas";

// POST /api/essay-ideas — three college essay ideas from the timeline.
//
// This runs on the server, so the API key is never sent to the browser (4.13).

export async function POST() {
  try {
    const achievements = await listAchievements();
    const result = await generateEssayIdeas(achievements);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NoAchievementsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof EssayIdeasError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Essay ideas failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
