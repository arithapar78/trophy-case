import { NextResponse } from "next/server";
import { listAchievements } from "@/lib/achievements";
import {
  generateEssayIdeas,
  NoAchievementsError,
  EssayIdeasError,
} from "@/lib/essay-ideas";
import {
  requirePrompt,
  recordPromptUsed,
  PromptLimitError,
} from "@/lib/prompt-limit";

// POST /api/essay-ideas — three college essay ideas from the timeline.
//
// This runs on the server, so the API key is never sent to the browser (4.13).

export async function POST() {
  try {
    const achievements = await listAchievements();

    // Real AI calls count against the prompt limit; MOCK mode doesn't,
    // because it never reaches the API (criteria 2.16, 2.23).
    const hasKey = Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim());
    if (hasKey) {
      await requirePrompt();
    }

    const result = await generateEssayIdeas(achievements);

    // Only spend the prompt once the call has actually succeeded (2.17).
    if (!result.isMock) {
      await recordPromptUsed("essay-ideas");
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PromptLimitError) {
      return NextResponse.json(
        {
          error: `You've used all your prompts for now. They reset at ${error.resetsAt.toLocaleTimeString()}.`,
          resetsAt: error.resetsAt.toISOString(),
        },
        { status: 429 },
      );
    }
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
