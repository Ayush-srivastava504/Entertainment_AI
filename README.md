# Marquee — AI Entertainment Platform

Next.js (App Router, TypeScript, Tailwind) frontend, deployed on Vercel.
Postgres is the single source of truth for everything the frontend reads —
nothing calls a third-party API (TMDB, AniList, OpenTDB, RSS feeds) at
request time.

```
Scheduled crawlers (GitHub Actions)  →  write rows into Postgres
On-demand AI tools (movie/anime      →  Vercel API route calls the
  recommender, tag generator, etc.)     hf-space/ model directly and
                                         returns the result in the same
                                         request (see lib/ai.ts)
Every page                            →  reads Postgres, nothing else
```

There is no EC2 instance and no daily batch job anymore. Content that used
to be generated once a day by an EC2 box now comes from real scheduled
crawlers, and on-demand tool requests are answered synchronously by a free
Hugging Face Space instead of being queued for a batch run.

```
entertainment-ai/
├── app/
│   ├── page.tsx                         # homepage
│   ├── movies/, anime/, rankings/       # catalog pages, DB-backed
│   ├── blog/                            # real news, crawled from RSS
│   ├── quizzes/                         # trivia quizzes, crawled from OpenTDB
│   ├── tools/tag-generator/page.tsx     # 🏷 tag generator (on-demand AI)
│   ├── tools/thumbnail-rating/page.tsx  # 🖼 thumbnail rating (on-demand AI)
│   └── api/queue/                       # POST to run an on-demand AI tool
├── components/
│   ├── Nav.tsx / Footer.tsx
│   ├── QuizPlayer.tsx                   # trivia quiz UI (scoring, tiers)
│   └── ToolShell.tsx                    # shared form + result UI for AI tools
├── lib/
│   ├── db.ts                            # Postgres client (server-only)
│   ├── ai.ts                            # calls the hf-space/ generator (server-only)
│   └── prompts.ts                       # one prompt template per AI tool
├── crawler/                              # scheduled crawlers (GitHub Actions)
│   ├── tmdb-crawler.mjs                 # movies
│   ├── anime-sync.mjs / jikan-crawler.mjs / sources/  # anime
│   ├── blog-crawler.mjs                 # real news via RSS
│   └── trivia-crawler.mjs               # trivia quizzes via OpenTDB
├── db/schema.sql
└── hf-space/                             # free Hugging Face Space serving the model
```

## 1. Run the frontend locally

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL at minimum — see "Set up the backend" below
npm run dev
# → http://localhost:3000
```

Catalog/blog/quiz pages need Postgres populated by the crawlers (step 2) to
show anything. The on-demand AI tools (tag generator, thumbnail rating)
need `HF_SPACE_URL` set (step 3) to return a result.

## 2. Set up the backend (Postgres + crawlers)

1. Create a free Postgres (Neon or Supabase), run `db/schema.sql` against it.
2. Put `DATABASE_URL` in Vercel's env vars **and** as a GitHub Actions
   secret (Settings → Secrets and variables → Actions) for the same repo —
   `.github/workflows/sync.yml` runs the crawlers on a schedule using it.
3. Get a free `TMDB_API_READ_ACCESS_TOKEN` and add it as a GitHub secret too.
4. Run `npm run crawl:all:full` once locally (or trigger the workflow
   manually) to do the first full catalog load.

## 3. Deploy the on-demand AI tools (optional)

The tag generator and thumbnail-rating tools call a small model hosted on
a free Hugging Face Space:

1. Create a Space at huggingface.co (SDK = Docker), push the contents of
   `hf-space/` to it. See `hf-space/README.md`.
2. Set `HF_SPACE_URL` in Vercel's env vars to that Space's `/generate`
   endpoint. If you made the Space private, also set `HF_TOKEN`.

If you skip this, every other part of the site (catalog, blog, quizzes)
still works — only the two AI tool pages will show an error.

## 4. Deploy the frontend to Vercel

```bash
npm i -g vercel
vercel
```
Add `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATION_SECRET`, and
(optionally) `HF_SPACE_URL`/`HF_TOKEN` in Project Settings → Environment
Variables.

## 5. Attach a custom domain

See **[`DOMAIN_SETUP.md`](./DOMAIN_SETUP.md)** — in short: add the domain
in Vercel, point its DNS at Vercel, then update one environment variable
(`NEXT_PUBLIC_SITE_URL`). Nothing else in the code needs to change.

## 6. Security

See **[`SECURITY.md`](./SECURITY.md)** for what's already locked down
(parameterized queries, security headers, rate limiting, secret handling)
and what to double check before going live.

## 7. Add more on-demand AI tools

Every tool follows the same shape:
1. Add a case to `buildPrompt()` in `lib/prompts.ts`.
2. Add the task name to `VALID_TASKS` in `app/api/queue/route.ts`.
3. Add a page that renders `<ToolShell task="..." buildInput={...} />`.

No new backend, no new model — same `hf-space/` model, one more prompt.
