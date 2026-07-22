/**
 * Blog crawler — fetches trending entertainment news from trusted RSS
 * feeds (movies, TV, anime, celebrities, gaming), summarizes each item,
 * and stores it in `blog_posts`. This is now the only writer for that
 * table — the old EC2 pipeline that used to also write LLM-invented
 * "evergreen" posts here has been removed.
 *
 * Summarization: this crawler has no dependency on the AI Creator service
 * (that's a separate build, task #3) — it produces a short EXTRACTIVE
 * summary from the feed's own excerpt (RSS `contentSnippet`/`content`),
 * never the full article body, and always links back to the source. If
 * AI_SUMMARY_ENDPOINT is set (pointing at the future AI Creator service's
 * REST endpoint), the crawler will call it per-item for a real abstractive
 * rewrite instead — see summarize() below. Until then it degrades cleanly
 * to the extractive path with zero config.
 *
 * Copyright: we only ever store what the feed itself publishes as an
 * excerpt (typically 1-3 sentences, meant for syndication) plus our own
 * summary of it, never a scrape of the full article — and every post
 * carries source_name/source_url attribution back to the original.
 *
 * Incremental by construction: `source_url` is unique in the DB, so
 * re-running against the same feeds is a no-op for stories already
 * imported (on conflict do nothing) — no separate "since last run"
 * bookkeeping needed.
 *
 *   node crawler/blog-crawler.mjs                # crawl all configured feeds
 *   node crawler/blog-crawler.mjs --limit=10       # cap items per feed
 */
import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { getPool, upsertBlogPosts, sleep } from "./db.mjs";
import { withRetry, RetryableError } from "./lib/retry.mjs";

const FEED_FAILURE_THRESHOLD = 3; // consecutive parse/fetch failures before skipping a feed for this run
const REQUEST_DELAY_MS = 800;

// Trusted, keyless, publicly syndicated RSS feeds. One entry can carry
// multiple tags; `category` drives /blog/category/[category].
const FEEDS = [
  { name: "Variety", url: "https://variety.com/feed/", category: "movies", tags: ["movies", "industry"] },
  { name: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/", category: "celebrities", tags: ["celebrities", "industry"] },
  { name: "Deadline", url: "https://deadline.com/feed/", category: "tv", tags: ["tv", "movies", "industry"] },
  { name: "Anime News Network", url: "https://www.animenewsnetwork.com/newsfeed/rss.xml", category: "anime", tags: ["anime"] },
  { name: "Polygon", url: "https://www.polygon.com/rss/index.xml", category: "gaming", tags: ["gaming"] },
  { name: "IGN", url: "https://feeds.ign.com/ign/all", category: "gaming", tags: ["gaming", "movies", "tv"] },
];

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const PER_FEED_LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 15;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "MarqueeBlogCrawler/1.0 (+https://intern-flow.in)" },
});

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(html) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Extractive summary: take the feed's own excerpt, split into sentences,
// keep the first few — this is a paraphrase-length excerpt of what the
// publisher already syndicates for exactly this purpose, not a scrape.
function extractiveSummary(text, maxSentences = 3, maxChars = 500) {
  const clean = stripHtml(text);
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  const picked = sentences.slice(0, maxSentences).join(" ").trim();
  return [picked.length > maxChars ? `${picked.slice(0, maxChars).trim()}…` : picked];
}

/**
 * Summarize one feed item into an array of body paragraphs. Calls out to
 * an AI Creator service if configured (AI_SUMMARY_ENDPOINT), else falls
 * back to the extractive summary above. A failed AI call falls back too
 * — summarization is never allowed to abort the crawl for one item.
 */
async function summarize(item) {
  const sourceText = item.contentSnippet || item.content || item.summary || item.title || "";
  const endpoint = process.env.AI_SUMMARY_ENDPOINT;
  if (!endpoint) return extractiveSummary(sourceText);

  try {
    const body = await withRetry(
      async () => {
        const res = await fetch(`${endpoint.replace(/\/$/, "")}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.title, text: stripHtml(sourceText) }),
          signal: AbortSignal.timeout(20000),
        });
        if (res.status === 429 || res.status >= 500) throw new RetryableError(`AI summary service ${res.status}`);
        if (!res.ok) throw new Error(`AI summary service ${res.status}`);
        return res.json();
      },
      { retries: 2, baseDelayMs: 1000, label: "AI summary", isRetryable: (err) => err instanceof RetryableError }
    );
    const paragraphs = Array.isArray(body?.paragraphs) ? body.paragraphs.filter(Boolean) : null;
    return paragraphs?.length ? paragraphs : extractiveSummary(sourceText);
  } catch (err) {
    console.warn(`  AI summary unavailable for "${item.title}", falling back to extractive: ${err.message}`);
    return extractiveSummary(sourceText);
  }
}

async function toRow(item, feed) {
  const body = await summarize(item);
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
  const title = (item.title ?? "Untitled").trim();
  // Hash the link, not the date, so the slug is 1:1 with source_url — the
  // actual uniqueness key. Two different stories that happen to share a
  // title on the same day never collide; the same story re-crawled always
  // slugifies identically.
  const urlHash = createHash("sha1").update(item.link).digest("hex").slice(0, 8);
  return {
    slug: `${slugify(title)}-${urlHash}`,
    title,
    meta_description: (body[0] ?? title).slice(0, 160),
    body,
    category: feed.category,
    tags: feed.tags,
    source_name: feed.name,
    source_url: item.link,
    published_at: publishedAt,
  };
}

async function fetchFeed(feed) {
  return withRetry(() => parser.parseURL(feed.url), {
    retries: 3,
    baseDelayMs: 1000,
    label: `feed ${feed.name}`,
    isRetryable: () => true, // network/timeout/parse errors on an RSS fetch are all worth retrying
  });
}

async function crawlFeed(feed) {
  const parsed = await fetchFeed(feed);
  const items = (parsed.items ?? []).slice(0, PER_FEED_LIMIT);
  const rows = [];
  for (const item of items) {
    if (!item.link || !item.title) continue;
    rows.push(await toRow(item, feed));
  }
  return rows;
}

async function main() {
  console.log(`Blog crawl starting: ${FEEDS.length} feeds, up to ${PER_FEED_LIMIT} items each`);
  let totalUpserted = 0;
  const feedResults = {};

  for (const feed of FEEDS) {
    let attempt = 0;
    let succeeded = false;
    while (attempt < FEED_FAILURE_THRESHOLD && !succeeded) {
      try {
        const rows = await crawlFeed(feed);
        const count = await upsertBlogPosts(rows);
        totalUpserted += count;
        feedResults[feed.name] = { fetched: rows.length, upserted: count };
        console.log(`  [${feed.name}] ${rows.length} item(s) processed, ${count} new/updated`);
        succeeded = true;
      } catch (err) {
        attempt += 1;
        console.error(`  [${feed.name}] attempt ${attempt}/${FEED_FAILURE_THRESHOLD} failed: ${err.message}`);
      }
    }
    if (!succeeded) {
      feedResults[feed.name] = { error: "gave up after retries" };
      console.warn(`  [${feed.name}] skipping this feed for this run — will retry next scheduled run.`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Blog crawl done: ${totalUpserted} post(s) upserted.`, feedResults);
  await getPool().end();
}

main().catch((err) => {
  console.error("Blog crawl failed:", err);
  process.exit(1);
});
