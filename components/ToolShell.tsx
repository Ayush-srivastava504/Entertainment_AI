"use client";

import { useState, FormEvent } from "react";

interface ToolShellProps {
  task: string;
  buildInput: (formData: FormData) => Record<string, string>;
  placeholder?: string;
  submitLabel?: string;
  /** Render extra fields above the main textarea (selects, etc). */
  extraFields?: React.ReactNode;
  showTextarea?: boolean;
  textareaName?: string;
}

interface QueueJobResponse {
  id: string;
  status: "done" | "failed";
  result?: string;
  error?: string;
}

export default function ToolShell({
  task,
  buildInput,
  placeholder = "Describe what you're looking for…",
  submitLabel = "Generate",
  extraFields,
  showTextarea = true,
  textareaName = "query",
}: ToolShellProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const input = buildInput(formData);

    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, input }),
      });
      const data: QueueJobResponse & { error?: string } = await res.json();
      if (!res.ok || data.status === "failed") {
        throw new Error(data.error || "Something went wrong.");
      }
      setResult(data.result ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {extraFields}
        {showTextarea && (
          <textarea
            name={textareaName}
            required
            rows={3}
            placeholder={placeholder}
            className="w-full rounded border border-marquee-line bg-marquee-panel px-4 py-3 text-marquee-text placeholder:text-marquee-textDim focus-ring outline-none"
          />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded bg-marquee-gold px-5 py-2.5 font-semibold text-marquee-bg transition hover:bg-marquee-amber disabled:opacity-50 focus-ring"
        >
          {submitting ? "Generating…" : submitLabel}
        </button>
      </form>

      {error && (
        <p className="text-sm text-marquee-amber font-mono">⚠ {error}</p>
      )}

      {result && (
        <div className="ticket p-6 pl-8 whitespace-pre-wrap leading-relaxed text-marquee-text">
          {result}
        </div>
      )}
    </div>
  );
}
