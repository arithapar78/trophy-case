import { NextResponse } from "next/server";
import {
  sendHelperMessage,
  getConversation,
  clearConversation,
  HelperError,
  PromptLimitError,
} from "@/lib/helper";
import { getLimitStatus } from "@/lib/prompt-limit";

// The AI helper endpoint. REQUIREMENTS-v2.md Feature 2.
//
// The limit is enforced here, on the server, so a request sent straight to
// this endpoint is refused just like one from the browser (criterion 2.16).

/** GET /api/helper — the conversation so far, and the current allowance. */
export async function GET() {
  return NextResponse.json({
    messages: await getConversation(),
    limit: await getLimitStatus(),
  });
}

/** POST /api/helper — send a message. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message ?? "");

    const reply = await sendHelperMessage(message);

    return NextResponse.json(reply);
  } catch (error) {
    if (error instanceof PromptLimitError) {
      return NextResponse.json(
        {
          error: "You've used all your prompts for now.",
          resetsAt: error.resetsAt.toISOString(),
          limit: await getLimitStatus(),
        },
        { status: 429 },
      );
    }
    if (error instanceof HelperError) {
      return NextResponse.json(
        { error: error.message, limit: await getLimitStatus() },
        { status: 502 },
      );
    }

    console.error("Helper request failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** DELETE /api/helper — clear the conversation (criterion 2.7). */
export async function DELETE() {
  await clearConversation();

  return NextResponse.json({
    messages: [],
    limit: await getLimitStatus(),
  });
}
