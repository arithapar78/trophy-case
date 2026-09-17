"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// The AI helper page. REQUIREMENTS-v2.md Feature 2.

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isMock: boolean;
  isCached: boolean;
};

type LimitStatus = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string | null;
  allowed: boolean;
};

function formatResetTime(iso: string | null): string {
  if (!iso) return "";

  const resetsAt = new Date(iso);
  const sameDay = resetsAt.toDateString() === new Date().toDateString();

  return resetsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }) + (sameDay ? "" : ` on ${resetsAt.toLocaleDateString()}`);
}

export default function HelperPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [limit, setLimit] = useState<LimitStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/helper");
    const data = await response.json();
    setMessages(data.messages ?? []);
    setLimit(data.limit ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();

    const question = draft.trim();
    if (!question || sending) return;

    setSending(true);
    setError(null);
    setDraft("");

    // Show the question straight away rather than waiting for the server
    // (criterion 2.3).
    const pending: Message = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: question,
      isMock: false,
      isCached: false,
    };
    setMessages((current) => [...current, pending]);

    try {
      const response = await fetch("/api/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.resetsAt
            ? `You've used all your prompts for now. They reset at ${formatResetTime(data.resetsAt)}.`
            : (data.error ?? "Something went wrong. Please try again."),
        );
        if (data.limit) setLimit(data.limit);
        // Reload so the conversation matches what the server actually saved.
        await load();
        return;
      }

      if (data.limit) setLimit(data.limit);
      await load();
    } catch {
      setError("Couldn't reach the app. Check that it's still running.");
      await load();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleClear() {
    const response = await fetch("/api/helper", { method: "DELETE" });
    const data = await response.json();
    setMessages([]);
    setLimit(data.limit ?? limit);
    setError(null);
  }

  const outOfPrompts = limit ? !limit.allowed : false;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10">
      <Link href="/" className="text-sm text-slate-600 hover:underline">
        ← Back to timeline
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Helper</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ask about your achievements.
          </p>
        </div>

        {limit && (
          <div className="text-right text-sm">
            <p data-testid="prompt-counter" className="font-medium">
              {limit.remaining} of {limit.limit} prompts left
            </p>
            {limit.resetsAt && (
              <p data-testid="reset-time" className="text-slate-500">
                Resets at {formatResetTime(limit.resetsAt)}
              </p>
            )}
          </div>
        )}
      </header>

      <section className="mt-6 flex-1">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-medium">Nothing asked yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Try “What themes run through my achievements?” or “What should I
              work on next?”
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => (
              <li
                key={message.id}
                data-testid={`message-${message.role}`}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-xl bg-slate-900 p-4 text-sm text-white"
                    : "mr-8 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                }
              >
                {message.role === "assistant" && (message.isMock || message.isCached) && (
                  <p
                    data-testid={message.isMock ? "mock-label" : "cached-label"}
                    className="mb-2 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                  >
                    {message.isMock ? "Sample answer (no API key set)" : "Saved answer — this didn't use a prompt"}
                  </p>
                )}
                <p className="whitespace-pre-line">{message.content}</p>
              </li>
            ))}

            {sending && (
              <li
                role="status"
                className="mr-8 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm"
              >
                Thinking...
              </li>
            )}
          </ul>
        )}
        <div ref={bottomRef} />
      </section>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="mt-4">
        <label htmlFor="message" className="sr-only">
          Your message
        </label>
        <textarea
          ref={inputRef}
          id="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter makes a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend(event);
            }
          }}
          rows={3}
          disabled={outOfPrompts}
          placeholder={
            outOfPrompts
              ? "You've used all your prompts for now."
              : "Ask the helper something..."
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="submit"
            disabled={sending || outOfPrompts || draft.trim().length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={sending}
              className="text-sm text-slate-600 hover:underline disabled:opacity-50"
            >
              Clear conversation
            </button>
          )}
        </div>

        {outOfPrompts && limit?.resetsAt && (
          <p
            data-testid="limit-reached"
            className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            You&apos;ve used all {limit.limit} of your prompts. They reset at{" "}
            <strong>{formatResetTime(limit.resetsAt)}</strong>.
          </p>
        )}
      </form>
    </main>
  );
}
