import { NextResponse } from "next/server";
import { recordPromptUsed, getLimitStatus } from "@/lib/prompt-limit";

// Dev-only: records prompt usage without calling Claude, so tests can reach
// the limit for free. Refused in production.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Number(body.count) || 1, 200);

  for (let i = 0; i < count; i++) {
    await recordPromptUsed("test");
  }

  return NextResponse.json({ limit: await getLimitStatus() });
}
