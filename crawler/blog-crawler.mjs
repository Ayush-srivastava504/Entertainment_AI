/*
This module crawls trending entertainment news from trusted RSS feeds and
stores them in the blog_posts table. It summarizes each item using either
an AI service or an extractive approach, and handles feed failures gracefully
with retry logic and skip tolerance.
*/

import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { getPool, upsertBlogPosts, sleep } from "./db.mjs";
import { withRetry, RetryableError } from "./lib/retry.mjs";

const FEED_FAILURE_THRESHOLD = 3;
const REQUEST_DELAY_MS = 800;

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

function extractiveSummary(text, maxSentences = 3, maxChars = 500) {
  const clean = stripHtml(text);
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  const picked = sentences.slice(0, maxSentences).join(" ").trim();
  return [picked.length > maxChars ? `${picked.slice(0, maxChars).trim()}…` : picked];
}

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
    isRetryable: () => true,
  });
}

// How many items get summarized concurrently within a single feed. Item
// summaries are independent (each is its own HTTP call to the AI endpoint,
// or pure local string work for the extractive fallback), so there's no
// reason to await them one at a time — that was the main source of the
// crawl's wall-clock time (up to 15 items x 6 feeds run fully serially,
// each with its own network round trip + retry backoff).
const ITEM_CONCURRENCY = 5;

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function crawlFeed(feed) {
  const parsed = await fetchFeed(feed);
  const items = (parsed.items ?? []).slice(0, PER_FEED_LIMIT).filter((item) => item.link && item.title);
  const rows = await mapWithConcurrency(items, ITEM_CONCURRENCY, (item) => toRow(item, feed));
  return rows;
}

async function crawlFeedWithRetries(feed) {
  let attempt = 0;
  while (attempt < FEED_FAILURE_THRESHOLD) {
    try {
      const rows = await crawlFeed(feed);
      const count = await upsertBlogPosts(rows);
      console.log(`  [${feed.name}] ${rows.length} item(s) processed, ${count} new/updated`);
      return { fetched: rows.length, upserted: count };
    } catch (err) {
      attempt += 1;
      console.error(`  [${feed.name}] attempt ${attempt}/${FEED_FAILURE_THRESHOLD} failed: ${err.message}`);
    }
  }
  console.warn(`  [${feed.name}] skipping this feed for this run — will retry next scheduled run.`);
  return { error: "gave up after retries" };
}

async function main() {
  console.log(`Blog crawl starting: ${FEEDS.length} feeds, up to ${PER_FEED_LIMIT} items each`);

  // Feeds are on entirely different domains, so there's no shared rate limit
  // that requires running them one after another — crawl them all at once.
  // REQUEST_DELAY_MS is still respected per-feed via a small stagger so we
  // don't fire all six requests in the exact same instant.
  const settled = await Promise.all(
    FEEDS.map(async (feed, i) => {
      await sleep(i * REQUEST_DELAY_MS);
      return [feed.name, await crawlFeedWithRetries(feed)];
    })
  );
  const feedResults = Object.fromEntries(settled);
  const totalUpserted = Object.values(feedResults).reduce((sum, r) => sum + (r.upserted ?? 0), 0);

  console.log(`Blog crawl done: ${totalUpserted} post(s) upserted.`, feedResults);
  await getPool().end();
}

main().catch((err) => {
  console.error("Blog crawl failed:", err);
  process.exit(1);
});