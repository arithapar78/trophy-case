import { describe, it, expect, afterEach } from "vitest";

// Covers REQUIREMENTS-v3.md T3.12 and criteria 1.24 to 1.28.
//
// The live site is open to strangers. The fake clock and the Free/Pro switch
// are TEST controls: if either worked in production, one request would let a
// visitor grant themselves 100 prompts on the owner's API key, or move the
// clock to wipe their own limit.

const originalNodeEnv = process.env.NODE_ENV;

// process.env rejects defineProperty, so assign through a loosely-typed view
// of it. NODE_ENV is read-only in the TypeScript types but writable at runtime.
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
});

function setNodeEnv(value: string) {
  env.NODE_ENV = value;
}

describe("the clock is locked in production (T3.12, 1.25)", () => {
  it("refuses to move", async () => {
    setNodeEnv("production");
    const { advanceClock } = await import("@/lib/settings");

    await expect(advanceClock(60_000)).rejects.toThrow(/production/i);
  });

  it("refuses to reset", async () => {
    setNodeEnv("production");
    const { resetClock } = await import("@/lib/settings");

    await expect(resetClock()).rejects.toThrow(/production/i);
  });

  it("reports real time regardless of any stored offset", async () => {
    setNodeEnv("production");
    const { now } = await import("@/lib/settings");

    const appTime = await now();
    expect(Math.abs(appTime.getTime() - Date.now())).toBeLessThan(2000);
  });

  it("still works in development", async () => {
    setNodeEnv("development");
    const { advanceClock, resetClock } = await import("@/lib/settings");

    await expect(advanceClock(60_000)).resolves.toBeTruthy();
    await expect(resetClock()).resolves.toBeTruthy();
  });
});

describe("everyone online is on Free (1.28)", () => {
  it("reports Free in production even if the database says Pro", async () => {
    setNodeEnv("development");
    const { setPlan } = await import("@/lib/settings");
    await setPlan("Pro");

    setNodeEnv("production");
    const { getSettings, getPromptLimit } = await import("@/lib/settings");

    // Found on the live site: a Pro row written before the endpoint was
    // locked kept granting 100 prompts after the fix.
    expect((await getSettings()).plan).toBe("Free");
    expect(await getPromptLimit()).toBe(10);
  });

  it("ignores a stored clock offset in production", async () => {
    setNodeEnv("development");
    const { advanceClock } = await import("@/lib/settings");
    await advanceClock(5 * 60 * 60 * 1000);

    setNodeEnv("production");
    const { getSettings } = await import("@/lib/settings");

    expect((await getSettings()).clockOffsetMs).toBe(0);
  });
});

describe("dev-only endpoints are gated (1.25, 1.27)", () => {
  it("the settings route refuses a plan change in production", async () => {
    setNodeEnv("production");
    const { PUT } = await import("@/app/api/settings/route");

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "Pro" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("the settings route refuses a clock change in production", async () => {
    setNodeEnv("production");
    const { PUT } = await import("@/app/api/settings/route");

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advanceClockMs: 18_000_000 }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("reset-prompts refuses in production", async () => {
    setNodeEnv("production");
    const { POST } = await import("@/app/api/dev/reset-prompts/route");

    expect((await POST()).status).toBe(403);
  });

  it("spend-prompts refuses in production", async () => {
    setNodeEnv("production");
    const { POST } = await import("@/app/api/dev/spend-prompts/route");

    const response = await POST(
      new Request("http://localhost/api/dev/spend-prompts", {
        method: "POST",
        body: JSON.stringify({ count: 10 }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("the settings route hides the dev tools flag in production", async () => {
    setNodeEnv("production");
    const { GET } = await import("@/app/api/settings/route");

    const body = await (await GET()).json();
    expect(body.devToolsAvailable).toBe(false);
  });
});
