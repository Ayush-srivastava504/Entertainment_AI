/**
 * Trivia crawler — pulls multiple-choice entertainment trivia from the
 * free, keyless Open Trivia Database (opentdb.com) and upserts one "deck"
 * per category into the `quizzes` table.
 *
 * Trivia quizzes have real correct/incorrect answers and a score-based
 * result tier (see QuizPlayer.tsx) — same pattern as the blog crawler
 * pulling real RSS data instead of LLM-invented blog posts.
 *
 * OpenTDB is rate-limited to one request per 5s per IP, hence the sleep
 * between categories below.
 *
 *   node crawler/trivia-crawler.mjs                # all configured decks
 *   node crawler/trivia-crawler.mjs --amount=15     # more questions per deck
 */
import { createHash } from "node:crypto";
import { getPool, upsertQuizzes, sleep } from "./db.mjs";
import { withRetry, RetryableError } from "./lib/retry.mjs";

const REQUEST_DELAY_MS = 5200; // stay under OpenTDB's 1 req/5s limit
const DEFAULT_AMOUNT = 10;

// response_code meanings (https://opentdb.com/api_config.php):
//   0 = Success  1 = No Results  2 = Invalid Parameter
//   3 = Token Not Found  4 = Token Empty  5 = Rate Limit
// Codes 4 and 5 are transient/recoverable; everything else means this
// deck genuinely can't be fetched right now (bad params, or the category
// truly doesn't have `amount` fresh questions left for this token).
const RETRYABLE_RESPONSE_CODES = new Set([4, 5]);

// OpenTDB category ids for entertainment topics this site cares about.
const DECKS = [
  { slug: "film-trivia", title: "Film Trivia", category: 11, description: "How well do you know movies? Test your film knowledge." },
  { slug: "television-trivia", title: "Television Trivia", category: 14, description: "From sitcoms to prestige drama — how much TV trivia do you know?" },
  { slug: "anime-manga-trivia", title: "Anime & Manga Trivia", category: 31, description: "A trivia deck for anime and manga fans." },
  { slug: "cartoons-animation-trivia", title: "Cartoons & Animation Trivia", category: 32, description: "Test your knowledge of cartoons and animated films." },
  { slug: "video-game-trivia", title: "Video Game Trivia", category: 15, description: "Level up your trivia game with these video game questions." },
  { slug: "music-trivia", title: "Music Trivia", category: 12, description: "From classic hits to chart-toppers — how much do you know about music?" },
];

function decodeHtmlEntities(str) {
  // OpenTDB encodes text as HTML entities by default. A small, explicit
  // map covers everything it actually emits — no need for a DOM/parser
  // dependency just for this.
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&eacute;/g, "é")
    .replace(/&hellip;/g, "…")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fixed score tiers, same shape for every deck: {minScore, maxScore, title, description}.
// `results` on the quizzes table is reused for this instead of the old
// personality "key/title/description" shape.
function tiersFor(total) {
  const third = Math.max(1, Math.round(total / 3));
  return [
    {
      minScore: 0,
      maxScore: third - 1,
      title: "Still Warming Up",
      description: `You got fewer than ${third} out of ${total} — give it another go, you'll get sharper fast.`,
    },
    {
      minScore: third,
      maxScore: total - third - 1 >= third ? total - third - 1 : third,
      title: "Solid Contender",
      description: `A respectable showing. You clearly know your stuff, just not everything (yet).`,
    },
    {
      minScore: Math.max(third + 1, total - third),
      maxScore: total,
      title: "Trivia Champion",
      description: `Nearly a clean sweep — you know this category cold.`,
    },
  ];
}

// A session token makes OpenTDB track which questions this crawler run
// has already seen, so re-running against a category with a small pool
// doesn't immediately hand back response_code=4 ("Token Empty"). Session
// tokens are free/keyless and expire after 6 hours of inactivity — one
// per crawler run is plenty; failing to get one just means we fall back
// to tokenless requests instead of aborting the whole run.
async function requestSessionToken() {
  try {
    const res = await withRetry(
      async () => {
        const r = await fetch("https://opentdb.com/api_token.php?command=request");
        if (!r.ok) throw new RetryableError(`OpenTDB token request ${r.status}`);
        return r;
      },
      { retries: 3, label: "opentdb token request" }
    );
    const data = await res.json();
    return data.response_code === 0 ? data.token : null;
  } catch (err) {
    console.warn(`trivia: could not get an OpenTDB session token (${err.message}) — continuing without one`);
    return null;
  }
}

async function resetSessionToken(token) {
  try {
    await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`);
  } catch {
    // best-effort; a failed reset just means the next fetch may 404/4 again
  }
}

/**
 * Fetches one deck's raw questions from OpenTDB.
 *
 * The important fix here: OpenTDB reports rate-limiting and an
 * exhausted session token via `response_code` inside a 200 OK JSON body
 * — NOT via an HTTP 429/5xx status. The previous version only inspected
 * `r.status` inside withRetry(), so a response_code=5 (rate limit) or
 * =4 (token empty) slipped past the HTTP-level check, got parsed as
 * "success", and then threw a plain (non-retried) Error that caused the
 * whole deck to be skipped for the rest of the run — even though the
 * very next request, 5 seconds later, would usually have succeeded.
 * Now the response_code check happens *inside* the retried callback, so
 * those two transient cases actually get retried with backoff.
 */
async function fetchDeck(category, amount, token) {
  const baseUrl = `https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple`;

  const data = await withRetry(
    async () => {
      const url = token ? `${baseUrl}&token=${token}` : baseUrl;
      const r = await fetch(url);
      if (r.status === 429) throw new RetryableError("OpenTDB rate limited (HTTP 429)");
      if (!r.ok) throw new Error(`OpenTDB HTTP ${r.status}`);

      const body = await r.json();

      if (body.response_code === 4 && token) {
        // Token has served every question in this category — reset it so
        // the retry can see the full pool again instead of failing forever.
        await resetSessionToken(token);
        throw new RetryableError("OpenTDB token exhausted (response_code=4), reset and retrying");
      }
      if (RETRYABLE_RESPONSE_CODES.has(body.response_code)) {
        throw new RetryableError(`OpenTDB response_code=${body.response_code} (transient), retrying`);
      }
      if (body.response_code !== 0 || !Array.isArray(body.results) || body.results.length === 0) {
        // Non-retryable: bad params, or genuinely not enough questions in
        // this category for the requested amount. Abort this deck now
        // rather than burning through retries that can't succeed.
        throw new Error(`OpenTDB returned response_code=${body.response_code} for category ${category}`);
      }
      return body;
    },
    { retries: 5, baseDelayMs: 5200, label: `opentdb category ${category}` }
  );

  return data.results;
}

function toQuestions(rawQuestions) {
  return rawQuestions.map((q) => {
    const correct = decodeHtmlEntities(q.correct_answer);
    const incorrect = q.incorrect_answers.map(decodeHtmlEntities);
    const options = shuffle([
      { text: correct, correct: true },
      ...incorrect.map((text) => ({ text, correct: false })),
    ]);
    return { text: decodeHtmlEntities(q.question), options };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const amountArg = args.find((a) => a.startsWith("--amount="));
  const amount = amountArg ? parseInt(amountArg.split("=")[1], 10) : DEFAULT_AMOUNT;

  const token = await requestSessionToken();
  if (token) {
    console.log("trivia: using an OpenTDB session token for this run");
  }

  const rows = [];
  for (const deck of DECKS) {
    try {
      const raw = await fetchDeck(deck.category, amount, token);
      const questions = toQuestions(raw);
      rows.push({
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        questions,
        results: tiersFor(questions.length),
      });
      console.log(`trivia: fetched ${questions.length} questions for '${deck.slug}'`);
    } catch (err) {
      console.error(`trivia: skipping '${deck.slug}' — ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (rows.length === 0) {
    console.log("trivia: no decks fetched this run, nothing to upsert.");
    return;
  }

  const count = await upsertQuizzes(rows);
  console.log(`trivia: upserted ${count} quiz deck(s).`);
  const pool = getPool();
  await pool.end();
}

main().catch((err) => {
  console.error("trivia crawler failed:", err);
  process.exitCode = 1;
});
