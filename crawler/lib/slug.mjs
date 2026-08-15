/*
Shared slug helpers used by crawlers when upserting movies/anime, mirrors
lib/slug.ts on the app side so generated URLs match on both sides. Keep the
two files in sync if the algorithm changes.
*/

export function slugifyTitle(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function buildMediaSlug(title, year, id) {
  const base = slugifyTitle(title || "untitled") || "untitled";
  const parts = [base];
  if (year) parts.push(String(year));
  parts.push(String(id));
  return parts.join("-");
}
