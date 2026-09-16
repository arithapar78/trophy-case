"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// Settings. REQUIREMENTS-v2.md Feature 1.

type SettingsResponse = {
  plan: "Free" | "Pro";
  promptLimit: number;
  clockOffsetMs: number;
  devToolsAvailable?: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Turns a millisecond offset into something readable, e.g. "2 days, 3 hours". */
function describeOffset(ms: number): string {
  if (ms === 0) return "real time";

  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (parts.length === 0) parts.push("less than an hour");

  return `${parts.join(", ")} ahead`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/settings");
    setSettings(await response.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Couldn't save that.");
        return;
      }

      setSettings((current) => ({ ...current, ...data }));
    } catch {
      setError("Couldn't reach the app. Check that it's still running.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-slate-600 hover:underline">
        ← Back to timeline
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Settings</h1>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Plan</h2>
        <p className="mt-1 text-sm text-slate-500">
          You are on the{" "}
          <strong data-testid="current-plan">{settings.plan}</strong> plan.
        </p>

        <div className="mt-4 flex gap-2" role="group" aria-label="Choose a plan">
          {(["Free", "Pro"] as const).map((plan) => {
            const isActive = settings.plan === plan;
            return (
              <button
                key={plan}
                type="button"
                onClick={() => update({ plan })}
                disabled={saving || isActive}
                aria-pressed={isActive}
                className={
                  isActive
                    ? "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                }
              >
                {plan}
              </button>
            );
          })}
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>This is a test switch, not a real subscription.</strong> There
          are no accounts or payments in this version — it exists so you can try
          both experiences. Switching plans never changes your achievements.
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 font-medium">Feature</th>
              <th className="py-2 font-medium">Free</th>
              <th className="py-2 font-medium">Pro</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100">
              <td className="py-2">AI prompts</td>
              <td className="py-2">10 every 5 hours</td>
              <td className="py-2">100 every 5 hours</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2">College recommendations</td>
              <td className="py-2 text-slate-400">No</td>
              <td className="py-2">Yes</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2">Uploaded files</td>
              <td className="py-2">Kept 60 days</td>
              <td className="py-2">Kept</td>
            </tr>
            <tr>
              <td className="py-2">Timeline, add, edit, delete</td>
              <td className="py-2">Yes</td>
              <td className="py-2">Yes</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-3 text-sm text-slate-500">
          Your plan allows{" "}
          <strong data-testid="prompt-limit">{settings.promptLimit}</strong> AI
          prompts every 5 hours.
        </p>
      </section>

      {settings.devToolsAvailable && (
        <section className="mt-6 rounded-xl border border-dashed border-slate-300 p-5">
          <h2 className="font-semibold">Testing tools</h2>
          <p className="mt-1 text-sm text-slate-500">
            For testing only. These let you skip ahead in time so you don&apos;t
            have to wait 5 hours to see prompts reset, or 60 days to see a file
            expire. Hidden when the app is built for real use.
          </p>

          <p className="mt-3 text-sm">
            The app currently thinks it is{" "}
            <strong data-testid="clock-offset">
              {describeOffset(settings.clockOffsetMs)}
            </strong>
            .
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => update({ advanceClockMs: 5 * HOUR_MS })}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Skip 5 hours
            </button>
            <button
              type="button"
              onClick={() => update({ advanceClockMs: 54 * DAY_MS })}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Skip 54 days
            </button>
            <button
              type="button"
              onClick={() => update({ advanceClockMs: 61 * DAY_MS })}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Skip 61 days
            </button>
            <button
              type="button"
              onClick={() => update({ resetClock: true })}
              disabled={saving || settings.clockOffsetMs === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Back to real time
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
