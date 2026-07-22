/*
This module crawls multiple-choice trivia questions from OpenTDB (Open Trivia
Database) and stores them as quiz decks in the database. It handles rate
limiting, session tokens, and question shuffling to create consistent
quiz experiences with score-based result tiers.
*/

import { createHash } from "node:crypto";
import { getPool, upsertQuizzes, sleep } from "./db.mjs";
import { withRetry, RetryableError } from "./lib/retry.mjs";

const REQUEST_DELAY_MS = 5200;
const DEFAULT_AMOUNT = 10;

const RETRYABLE_RESPONSE_CODES = new Set([4, 5]);

const DECKS = [
  { slug: "film-trivia", title: "Film Trivia", category: 11, description: "How well do you know movies? Test your film knowledge." },
  { slug: "television-trivia", title: "Television Trivia", category: 14, description: "From sitcoms to prestige drama — how much TV trivia do you know?" },
  { slug: "anime-manga-trivia", title: "Anime & Manga Trivia", category: 31, description: "A trivia deck for anime and manga fans." },
  { slug: "cartoons-animation-trivia", title: "Cartoons & Animation Trivia", category: 32, description: "Test your knowledge of cartoons and animated films." },
  { slug: "video-game-trivia", title: "Video Game Trivia", category: 15, description: "Level up your trivia game with these video game questions." },
  { slug: "music-trivia", title: "Music Trivia", category: 12, description: "From classic hits to chart-toppers — how much do you know about music?" },
];

function decodeHtmlEntities(str) {
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
  }
}

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
        await resetSessionToken(token);
        throw new RetryableError("OpenTDB token exhausted (response_code=4), reset and retrying");
      }
      if (RETRYABLE_RESPONSE_CODES.has(body.response_code)) {
        throw new RetryableError(`OpenTDB response_code=${body.response_code} (transient), retrying`);
      }
      if (body.response_code !== 0 || !Array.isArray(body.results) || body.results.length === 0) {
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