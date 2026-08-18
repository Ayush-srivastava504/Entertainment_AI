"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

// The panel (message list, polling, form) is only needed once someone
// actually opens the chat, so it's lazy-loaded into its own chunk instead
// of shipping in the shared bundle every page downloads on load.
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), {
  ssr: false,
});

export default function GlobalChat() {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) trackEvent("chat_widget_opened");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && <ChatPanel onClose={() => setOpen(false)} />}

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
