"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface ChatMessage {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const NAME_KEY = "chat:name";
const POLL_MS = 3000;

function secondsAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export default function GlobalChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Bump this every second just to re-render the "disappears in Xs" labels
  // below without refetching from the server.
  const [, forceTick] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) setName(stored);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch {
        // Silently ignore — next poll will retry. Chat is best-effort.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) trackEvent("chat_widget_opened");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || sending) return;

    const trimmedName = name.trim() || "Anonymous";
    localStorage.setItem(NAME_KEY, trimmedName);

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, body: trimmedBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send that message.");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setBody("");
      trackEvent("chat_message_sent");
    } catch {
      setError("Could not send that message. Try again shortly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="ticket flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-marquee-line px-4 py-3">
            <div>
              <p className="font-display text-lg text-marquee-text leading-none">
                Global Chat
              </p>
              <p className="mt-1 font-mono text-[10px] text-marquee-textDim">
                Messages disappear after 2 minutes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-marquee-textDim hover:text-marquee-gold focus-ring rounded px-1"
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="flex h-72 flex-col gap-2 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-marquee-textDim">
                No one's said anything in the last 2 minutes — say hi.
              </p>
            )}
            {messages.map((m) => {
              const remaining = 120 - secondsAgo(m.created_at);
              return (
                <div key={m.id} className="text-sm leading-snug">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-marquee-gold">
                      {m.author_name}
                    </span>
                    <span className="font-mono text-[10px] text-marquee-textDim shrink-0">
                      {remaining > 0 ? `${remaining}s left` : "expiring…"}
                    </span>
                  </div>
                  <p className="text-marquee-text break-words">{m.body}</p>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-marquee-line p-3 space-y-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              className="w-full rounded border border-marquee-line bg-transparent px-3 py-1.5 text-xs text-marquee-text placeholder:text-marquee-textDim focus-ring"
            />
            <div className="flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Say something..."
                maxLength={300}
                className="w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="shrink-0 rounded bg-marquee-gold px-4 py-2 text-sm font-semibold text-marquee-bg disabled:opacity-50 focus-ring"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full bg-marquee-gold px-5 py-3 font-semibold text-marquee-bg shadow-lg transition hover:bg-marquee-amber focus-ring"
      >
        {open ? "Close chat" : "💬 Chat"}
      </button>
    </div>
  );
}
