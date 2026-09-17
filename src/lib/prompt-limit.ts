import { db } from "@/lib/db";
import { getSettings, now, PROMPT_LIMITS, PROMPT_WINDOW_MS } from "@/lib/settings";

// The prompt limit. REQUIREMENTS-v2.md Feature 2, criteria 2.8 to 2.18.
//
// This is the thing standing between a runaway loop and a real API bill, so
// it is enforced on the server (criterion 2.16) and every AI endpoint must
// go through it. A prompt is only ever recorded AFTER a call succeeds, so a
// failure costs nothing (criterion 2.17).

export type LimitStatus = {
  limit: number;
  used: number;
  remaining: number;
  /** When the current window resets, or null when nothing has been spent. */
  resetsAt: Date | null;
  /** True when a prompt can be spent right now. */
  allowed: boolean;
};

/** Thrown when the limit is used up. */
export class PromptLimitError extends Error {
  readonly resetsAt: Date;

  constructor(resetsAt: Date) {
    super("You've used all your prompts for now.");
    this.name = "PromptLimitError";
    this.resetsAt = resetsAt;
  }
}

/**
 * The start of the current window.
 *
 * The window opens at the FIRST prompt after a quiet period, not at midnight
 * and not when the app started (criterion 2.14). So: find the oldest prompt
 * that is still within five hours of now, and the window runs from there.
 */
async function windowStart(current: Date): Promise<Date | null> {
  const cutoff = new Date(current.getTime() - PROMPT_WINDOW_MS);

  const oldest = await db.promptUsage.findFirst({
    where: { usedAt: { gt: cutoff } },
    orderBy: { usedAt: "asc" },
  });

  return oldest?.usedAt ?? null;
}

/** How many prompts are left, and when they reset. */
export async function getLimitStatus(): Promise<LimitStatus> {
  const { plan } = await getSettings();
  const limit = PROMPT_LIMITS[plan];
  const current = await now();

  const start = await windowStart(current);

  if (!start) {
    // Nothing spent recently: a full allowance, and no window open yet.
    return { limit, used: 0, remaining: limit, resetsAt: null, allowed: true };
  }

  const used = await db.promptUsage.count({
    where: { usedAt: { gte: start } },
  });

  const remaining = Math.max(0, limit - used);

  return {
    limit,
    used,
    remaining,
    resetsAt: new Date(start.getTime() + PROMPT_WINDOW_MS),
    allowed: remaining > 0,
  };
}

/**
 * Checks there's a prompt available, throwing if not.
 *
 * Call this BEFORE an API call. It doesn't spend anything — that's
 * recordPromptUsed, called after the call succeeds.
 */
export async function requirePrompt(): Promise<LimitStatus> {
  const status = await getLimitStatus();

  if (!status.allowed) {
    // resetsAt is always set when the limit is used up, but fall back to the
    // full window rather than risk a crash in the error path.
    const resetsAt =
      status.resetsAt ?? new Date((await now()).getTime() + PROMPT_WINDOW_MS);
    throw new PromptLimitError(resetsAt);
  }

  return status;
}

/**
 * Records that a prompt was spent. Only ever called after a successful API
 * call, so failures and cache hits cost nothing (criteria 2.17, 2.19).
 */
export async function recordPromptUsed(job: string): Promise<LimitStatus> {
  await db.promptUsage.create({
    data: { job, usedAt: await now() },
  });

  return getLimitStatus();
}

/** Clears the history. Used by tests and by "delete all my data" in v3. */
export async function resetPromptUsage(): Promise<void> {
  await db.promptUsage.deleteMany({});
}
