/*
This module provides a thin wrapper around gtag.js for analytics tracking.
It safely handles server-side rendering and cases where gtag is not loaded,
allowing components to track events without directly accessing window.
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