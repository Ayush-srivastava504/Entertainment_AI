/*
Builds the query string for the dynamic Open Graph image route at
/api/og (see app/api/og/route.tsx). Centralizing this keeps every page's
metadata block using the same param names and truncation rules.

Returns a relative URL ("/api/og?...") rather than an absolute one — Next.js
resolves relative image URLs in metadata against `metadataBase`, which is
already set in app/layout.tsx, so callers don't need to know BASE_URL.
*/

export interface OgImageParams {
  /** Main headline, e.g. a movie/anime title or page heading. */
  title: string;
  /** Smaller line under the title — description, tagline, or stat. */
  subtitle?: string;
  /** Short uppercase label in the top-left corner, e.g. "MOVIE", "RANKING". */
  badge?: string;
  /** Absolute poster/thumbnail URL to render alongside the text. */
  poster?: string;
  /** Short rating string, e.g. "★ 8.4". */
  rating?: string;
}

export function buildOgImageUrl(params: OgImageParams): string {
  const qs = new URLSearchParams();
  qs.set("title", params.title.slice(0, 120));
  if (params.subtitle) qs.set("subtitle", params.subtitle.slice(0, 160));
  if (params.badge) qs.set("badge", params.badge.slice(0, 24));
  if (params.poster) qs.set("poster", params.poster);
  if (params.rating) qs.set("rating", params.rating.slice(0, 16));
  return `/api/og?${qs.toString()}`;
}
