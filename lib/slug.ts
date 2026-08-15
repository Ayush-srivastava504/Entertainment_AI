/*
Shared slug helpers for building human-readable, SEO-friendly URLs for movie
and anime detail pages (e.g. /movies/the-matrix-1999-603 instead of
/movies/603). The numeric catalog id is always appended so slugs stay unique
even when two titles share a name, or a title changes after the URL has
already been indexed by search engines.
*/

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (é -> e)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function buildMediaSlug(
  title: string,
  year: number | null | undefined,
  id: string
): string {
  const base = slugifyTitle(title || "untitled") || "untitled";
  const parts = [base];
  if (year) parts.push(String(year));
  parts.push(String(id));
  return parts.join("-");
}

/**
 * Pulls the trailing numeric catalog id back out of a slug like
 * "the-matrix-1999-603" -> "603". Falls back to the raw input for legacy
 * links that are still just the bare numeric id ("603" -> "603").
 */
export function idFromSlug(slug: string): string {
  const match = slug.match(/(\d+)$/);
  return match ? match[1] : slug;
}
