"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function CommentSection({
  type,
  slug,
}: {
  type: "blog" | "quiz";
  slug: string;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/comments?type=${type}&slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]));
  }, [type, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug, name, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post that comment.");
        setStatus("error");
        return;
      }
      setComments((prev) => [data.comment, ...(prev ?? [])]);
      setBody("");
      setStatus("idle");
      trackEvent("post_comment", { content_type: type, slug });
    } catch {
      setError("Could not post that comment. Try again shortly.");
      setStatus("error");
    }
  }

  return (
    <section className="mt-12 border-t border-marquee-line pt-8">
      <h2 className="font-display text-2xl text-marquee-text mb-4">
        Comments {comments ? `(${comments.length})` : ""}
      </h2>

      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          className="w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          maxLength={1000}
          rows={3}
          className="w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
        />
        <button
          type="submit"
          disabled={status === "sending" || !name.trim() || !body.trim()}
          className="rounded bg-marquee-gold px-4 py-2 text-sm font-semibold text-marquee-bg disabled:opacity-50 focus-ring"
        >
          {status === "sending" ? "Posting..." : "Post comment"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {comments === null && (
        <p className="text-sm text-marquee-textDim">Loading comments...</p>
      )}
      {comments?.length === 0 && (
        <p className="text-sm text-marquee-textDim">
          No comments yet — be the first.
        </p>
      )}
      <div className="space-y-4">
        {comments?.map((c) => (
          <div key={c.id} className="ticket p-4">
            <div className="flex items-baseline justify-between mb-1">
              <p className="font-mono text-sm text-marquee-gold">{c.author_name}</p>
              <p className="font-mono text-xs text-marquee-textDim">
                {new Date(c.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <p className="text-sm text-marquee-text whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
