import { db } from "@/lib/db";

// App settings. v2 has no accounts, so there is exactly one settings row.
// The plan lives on the server (criterion 1.9) so the browser can't fake it.

export const PLANS = ["Free", "Pro"] as const;
export type Plan = (typeof PLANS)[number];

/** Prompts allowed per 5-hour window, per plan. Decision 2 in REQUIREMENTS-v2.md. */
export const PROMPT_LIMITS: Record<Plan, number> = {
  Free: 10,
  Pro: 100,
};

/** How long a prompt window lasts before the count resets. */
export const PROMPT_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours

/** How long a Free user's uploaded file is kept. */
export const FREE_FILE_LIFETIME_DAYS = 60;

/** How many days before deletion the warning starts. */
export const EXPIRY_WARNING_DAYS = 7;

const SINGLETON_ID = "singleton";

export type Settings = {
  id: string;
  plan: Plan;
  clockOffsetMs: number;
  createdAt: Date;
  updatedAt: Date;
};

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && PLANS.includes(value as Plan);
}

/**
 * Reads the settings, creating the row on first use.
 *
 * Everything defaults to Free, so a fresh install gets the more restrictive
 * plan rather than accidentally handing out Pro.
 */
export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) {
    return { ...existing, plan: normalisePlan(existing.plan) };
  }

  const created = await db.settings.create({ data: { id: SINGLETON_ID } });
  return { ...created, plan: normalisePlan(created.plan) };
}

/**
 * The database column is a plain string, so guard against anything unexpected
 * (a hand-edited database, a future migration) rather than trusting it.
 */
function normalisePlan(value: string): Plan {
  return isPlan(value) ? value : "Free";
}

/** Changes the plan. Never touches achievements (criterion 1.10). */
export async function setPlan(plan: Plan): Promise<Settings> {
  if (!isPlan(plan)) {
    throw new Error(`"${plan}" is not a valid plan.`);
  }

  await getSettings(); // make sure the row exists

  const updated = await db.settings.update({
    where: { id: SINGLETON_ID },
    data: { plan },
  });

  return { ...updated, plan: normalisePlan(updated.plan) };
}

/** The prompt limit for the current plan. */
export async function getPromptLimit(): Promise<number> {
  const { plan } = await getSettings();
  return PROMPT_LIMITS[plan];
}

/**
 * The app's idea of "now".
 *
 * Everything time-based in v2 — the 5-hour prompt window, the 60-day file
 * expiry — reads the clock through here, so a dev-only offset can move time
 * forward and make both testable in minutes (criteria 2.18, 9.11).
 * The offset is always 0 in production.
 */
export async function now(): Promise<Date> {
  if (process.env.NODE_ENV === "production") {
    return new Date();
  }

  const { clockOffsetMs } = await getSettings();
  return new Date(Date.now() + clockOffsetMs);
}

/** Moves the app's clock forward, for testing. Dev only. */
export async function advanceClock(milliseconds: number): Promise<Settings> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The clock can't be changed in production.");
  }

  const current = await getSettings();
  const updated = await db.settings.update({
    where: { id: SINGLETON_ID },
    data: { clockOffsetMs: current.clockOffsetMs + milliseconds },
  });

  return { ...updated, plan: normalisePlan(updated.plan) };
}

/** Puts the clock back to real time. Dev only. */
export async function resetClock(): Promise<Settings> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The clock can't be changed in production.");
  }

  await getSettings();
  const updated = await db.settings.update({
    where: { id: SINGLETON_ID },
    data: { clockOffsetMs: 0 },
  });

  return { ...updated, plan: normalisePlan(updated.plan) };
}
