"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

interface ToolShellProps {
  task: string;
  buildInput: (formData: FormData) => Record<string, string>;
  placeholder?: string;
  submitLabel?: string;
  /** Render extra fields above the main textarea (selects, etc). */
  extraFields?: React.ReactNode;
  /** If false, hides the default free-text textarea (e.g. quiz generator needs none). */
  showTextarea?: boolean;
  textareaName?: string;
}

type JobStatus = "idle" | "queued" | "done" | "failed";

interface QueueJobResponse {
  id: string;
  status: "pending" | "done" | "failed";
  result: string | null;
  error: string | null;
}

// Jobs only resolve once the EC2 batch pipeline runs (once a day), so we
// remember the job id per tool and re-check it on page load — no point
// polling every few seconds against something that updates once daily.
function storageKey(task: string) {
  return `marquee:queue-job:${task}`;
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
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount, resume tracking any job this browser already queued for this tool.
  useEffect(() => {
    const savedId = window.localStorage.getItem(storageKey(task));
    if (savedId) {
      setJobId(savedId);
      setStatus("queued");
      checkJob(savedId);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  async function checkJob(id: string) {
    try {
      const res = await fetch(`/api/queue/${id}`);
      if (!res.ok) {
        return; // keep showing "queued" — transient errors shouldn't flip state
      }
      const data: QueueJobResponse = await res.json();
      if (data.status === "done") {
        setResult(data.result);
        setStatus("done");
        window.localStorage.removeItem(storageKey(task));
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (data.status === "failed") {
        setError(data.error || "This job failed during the last batch run.");
        setStatus("failed");
        window.localStorage.removeItem(storageKey(task));
        if (pollRef.current) clearInterval(pollRef.current);
      }
      // still "pending" → leave as "queued", let the interval keep checking
    } catch {
      // network hiccup — try again on the next interval tick
    }
  }

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      window.localStorage.setItem(storageKey(task), data.id);
      setJobId(data.id);
      setStatus("queued");

      // Poll every 30s in case the batch happens to run while the tab is open.
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => checkJob(data.id), 30_000);
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
          disabled={submitting || status === "queued"}
          className="inline-flex items-center gap-2 rounded bg-marquee-gold px-5 py-2.5 font-semibold text-marquee-bg transition hover:bg-marquee-amber disabled:opacity-50 focus-ring"
        >
          {submitting
            ? "Submitting…"
            : status === "queued"
            ? "Already queued…"
            : submitLabel}
        </button>
      </form>

      {error && (
        <p className="text-sm text-marquee-amber font-mono">⚠ {error}</p>
      )}

      {status === "queued" && (
        <div className="ticket p-6 pl-8 leading-relaxed text-marquee-textDim">
          <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
            ⏳ QUEUED
          </p>
          <p>
            Your request is queued for the next daily generation run. Come
            back later and this page will pick the result back up
            automatically — no need to resubmit.
          </p>
          {jobId && (
            <p className="mt-2 font-mono text-xs opacity-60">job {jobId}</p>
          )}
        </div>
      )}

      {status === "done" && result && (
        <div className="ticket p-6 pl-8 whitespace-pre-wrap leading-relaxed text-marquee-text">
          {result}
        </div>
      )}
    </div>
  );
}
