"use client";

import { useState } from "react";
import type { EssayIdea } from "@/lib/essay-ideas";

// The "Give me 3 college essay ideas" button and its results.
// REQUIREMENTS.md Feature 4.

export default function EssayIdeas() {
  const [ideas, setIdeas] = useState<EssayIdea[] | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/essay-ideas", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setIdeas(data.ideas);
      setIsMock(data.isMock);
    } catch {
      setError("Couldn't reach the app. Check that it's still running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">College essay ideas</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Claude reads your achievements and suggests three angles.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Give me 3 college essay ideas"}
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-slate-500" role="status">
          Reading your achievements...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {ideas && !loading && (
        <div className="mt-4">
          {isMock && (
            <p
              data-testid="mock-notice"
              className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <strong>Sample ideas.</strong> No Claude API key is set, so these
              are examples rather than real suggestions. Add{" "}
              <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code>{" "}
              to your <code className="rounded bg-amber-100 px-1">.env.local</code>{" "}
              file for the real thing.
            </p>
          )}

          <ol className="space-y-3">
            {ideas.map((idea, index) => (
              <li
                key={index}
                data-testid="essay-idea"
                className="rounded-lg border border-slate-200 p-4"
              >
                <h3 className="font-medium">
                  {index + 1}. {idea.title}
                </h3>
                <p className="mt-1 text-sm text-slate-700">{idea.hook}</p>
                {idea.achievements.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-medium">Based on:</span>{" "}
                    {idea.achievements.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
