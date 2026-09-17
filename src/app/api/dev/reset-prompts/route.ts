import { NextResponse } from "next/server";
import { resetPromptUsage } from "@/lib/prompt-limit";
import { getLimitStatus } from "@/lib/prompt-limit";

// Dev-only: clears the prompt history so tests can start from a full
// allowance without waiting 5 hours or spending real prompts.
//
// Refused in production, like the fake clock and the plan switch
// (criteria 1.24 to 1.28 in REQUIREMENTS-v3.md).
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production." },
      { status: 403 },
    );
  }

  await resetPromptUsage();

  return NextResponse.json({ limit: await getLimitStatus() });
}
