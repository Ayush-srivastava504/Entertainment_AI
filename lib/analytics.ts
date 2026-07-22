/**
 * Thin wrapper around gtag.js so components never touch `window` directly
 * or need to guard against gtag not being loaded yet (ad blockers, SSR,
 * the script tag not having executed yet on a fast click, etc).
 *
 * Usage: trackEvent("like_content", { content_type: "quiz", slug });
 *
 * Event names loosely follow GA4's recommended-event conventions where one
 * exists (search, select_content...) and use plain custom names otherwise.
 * These show up in GA4 under Admin -> Events, and can be marked as "key
 * events" (formerly "conversions") there once they start recording —
 * nothing else needs to change on the code side to promote one.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEvent =
  | "search"
  | "select_content"
  | "add_to_favorites"
  | "remove_from_favorites"
  | "like_content"
  | "post_comment"
  | "quiz_start"
  | "quiz_answer"
  | "quiz_complete"
  | "chat_message_sent"
  | "chat_widget_opened";

export function trackEvent(
  name: AnalyticsEvent,
  params: Record<string, string | number | boolean | undefined> = {}
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
