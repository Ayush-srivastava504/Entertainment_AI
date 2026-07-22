-- Shared Postgres schema.
-- Vercel (Next.js) inserts rows and reads results back in the same request
-- (see lib/ai.ts + app/api/queue/route.ts — this calls the free Hugging
-- Face Space in hf-space/ synchronously; there is no longer a separate
-- daily batch job to wait on).
--
-- Run this once against whichever Postgres you provision (Neon / Supabase /
-- RDS / any reachable Postgres).

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists queue_jobs (
  id          uuid primary key default gen_random_uuid(),
  task        text not null,          -- matches lib/prompts.ts Task union
  input       jsonb not null,         -- the form fields submitted by the user
  status      text not null default 'pending', -- pending | done | failed
  result      text,
  error       text,
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_queue_jobs_status on queue_jobs (status);
create index if not exists idx_queue_jobs_created on queue_jobs (created_at desc);

-- ---------------------------------------------------------------------
-- blog_posts is written to by one crawler now:
--  crawler/blog-crawler.mjs (GitHub Actions, scheduled) — real trending
--  news pulled from RSS feeds (movies/TV/anime/celebrities/gaming),
--  extractively summarized (or abstractively, if AI_SUMMARY_ENDPOINT is
--  set), always attributed via source_name/source_url.
-- (The old EC2 pipeline used to also write LLM-invented "evergreen"
-- posts here with no external grounding — that job has been removed;
-- every row now traces back to a real source.)
-- ---------------------------------------------------------------------

create table if not exists blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  meta_description  text not null,
  body              jsonb not null,        -- array of paragraph strings
  category          text,                   -- 'movies' | 'tv' | 'anime' | 'celebrities' | 'gaming' | null (evergreen pipeline posts)
  tags              text[] not null default '{}',
  source_name       text,                   -- e.g. "Variety" — null for pipeline-generated posts
  source_url        text unique,            -- original article link; unique so re-crawling a feed never duplicates a story
  likes             integer not null default 0,
  published_at      timestamptz not null default now()
);

-- Additive, idempotent migration for pre-existing tables.
alter table blog_posts add column if not exists category text;
alter table blog_posts add column if not exists tags text[] not null default '{}';
alter table blog_posts add column if not exists source_name text;
alter table blog_posts add column if not exists source_url text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_source_url_key') then
    alter table blog_posts add constraint blog_posts_source_url_key unique (source_url);
  end if;
end $$;

create index if not exists idx_blog_posts_published on blog_posts (published_at desc);
create index if not exists idx_blog_posts_category on blog_posts (category, published_at desc);
create index if not exists idx_blog_posts_tags on blog_posts using gin (tags);

create table if not exists rankings (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,          -- 'movie' | 'anime'
  slug              text unique not null,
  title             text not null,
  meta_description  text not null,
  intro             text not null,
  items             jsonb not null,         -- array of {title, year, blurb}
  published_at      timestamptz not null default now()
);

create index if not exists idx_rankings_category on rankings (category, published_at desc);

-- Trivia quizzes — populated by crawler/trivia-crawler.mjs (source:
-- OpenTDB, free/keyless), on a schedule (see .github/workflows/sync.yml).
-- This replaced the old EC2 pipeline's LLM-generated "personality quiz"
-- format entirely: every question now has one real correct answer instead
-- of mapping to a personality-type key.
--   questions: [{ text, options: [{ text, correct: boolean }] }]
--   results:   [{ minScore, maxScore, title, description }]  -- score tiers
create table if not exists quizzes (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  description       text not null,
  questions         jsonb not null,
  results           jsonb not null,
  likes             integer not null default 0,
  published_at      timestamptz not null default now()
);

create index if not exists idx_quizzes_published on quizzes (published_at desc);

-- ---------------------------------------------------------------------
-- Comments — anyone can post, no login. content_type + content_slug
-- together point at a blog_posts.slug or quizzes.slug row (no foreign
-- key on purpose: keeps this table decoupled from which content table
-- is on the other end, and comments survive even if you regenerate slugs).
-- ---------------------------------------------------------------------

create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  content_type  text not null,          -- 'blog' | 'quiz'
  content_slug  text not null,
  author_name   text not null,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_lookup on comments (content_type, content_slug, created_at desc);

-- Migrating an existing database that already has these tables without
-- the new columns? Run this once:
--   alter table blog_posts add column if not exists likes integer not null default 0;
--   alter table quizzes add column if not exists likes integer not null default 0;

-- ---------------------------------------------------------------------
-- Anime catalog — populated by crawler/jikan-crawler.mjs (source: Jikan,
-- the free/keyless REST wrapper around MyAnimeList). Nothing in app/
-- ever calls Jikan directly; every page reads this table.
-- ---------------------------------------------------------------------

create extension if not exists pg_trgm; -- fast ILIKE search on title

-- id is a MyAnimeList id whenever any source can supply one (Jikan always
-- can; AniList via idMal; Kitsu via its mappings include) — this is what
-- keeps AniList/Kitsu/Jikan writing to the SAME row for the same anime
-- instead of creating duplicates. Only anime with no MAL mapping at all
-- get a synthetic "al-<id>" / "ki-<id>" id. See crawler/sources/*.mjs.
create table if not exists anime (
  id             text primary key,        -- MyAnimeList id when known, else "al-"/"ki-" prefixed
  title          text not null,
  title_english  text,
  synopsis       text,
  poster_url     text,
  trailer_url    text,
  year           integer,
  score          numeric,
  popularity     integer,                 -- lower = more popular (Jikan convention — all sources normalize to this)
  rank           integer,
  episodes       integer,
  status         text,                    -- 'Currently Airing' | 'Finished Airing' | 'Not yet aired'
  type           text,                    -- TV | Movie | OVA | ...
  genres         text[] not null default '{}',
  studios        text[] not null default '{}',
  aired_from     date,
  aired_to       date,
  raw            jsonb not null,          -- full upstream payload, for future fields without a migration
  source         text not null default 'jikan', -- 'anilist' | 'kitsu' | 'jikan' — which API last wrote this row
  updated_at     timestamptz not null default now()
);

-- Additive, idempotent migration for tables created before the AniList/
-- Kitsu fallback chain existed (create table if not exists won't add new
-- columns to an already-existing table).
alter table anime add column if not exists source text not null default 'jikan';

create index if not exists idx_anime_score on anime (score desc nulls last);
create index if not exists idx_anime_popularity on anime (popularity asc nulls last);
create index if not exists idx_anime_year on anime (year desc nulls last);
create index if not exists idx_anime_status on anime (status);
create index if not exists idx_anime_genres on anime using gin (genres);
create index if not exists idx_anime_title_trgm on anime using gin (title gin_trgm_ops);
create index if not exists idx_anime_source on anime (source);

-- ---------------------------------------------------------------------
-- Movie catalog — populated by crawler/tmdb-crawler.mjs (source:
-- TMDB, The Movie Database — free read access token, self-serve,
-- instant, no approval wait). TMDB hosts poster/backdrop images
-- directly, so no separate poster-backfill step is needed. Nothing
-- in app/ ever calls TMDB directly; every page reads this table.
--
-- (Earlier revisions of this project used Trakt.tv, and before that
-- YTS.mx — a torrent/piracy site, not a legitimate metadata API, whose
-- domain has since been taken down by copyright enforcement. Both were
-- replaced for good reason.)
-- ---------------------------------------------------------------------

create table if not exists movies (
  id              text primary key,       -- TMDB id
  imdb_code       text,
  tmdb_id         text,                   -- same value as id, kept for clarity/back-compat
  slug            text,
  title           text not null,
  tagline         text,
  description     text,
  poster_url      text,                   -- from TMDB poster_path, filled by tmdb-crawler.mjs
  background_url  text,                   -- from TMDB backdrop_path
  trailer_url     text,
  year            integer,
  score           numeric,                -- 0-10, TMDB vote average
  runtime         integer,                -- minutes
  genres          text[] not null default '{}',
  language        text,
  watchers        integer,                -- from trending/movie/week popularity (trending signal)
  plays           integer,                -- from movie/popular popularity (popularity signal)
  list_count      integer,                -- from movie/upcoming popularity (anticipated/upcoming signal)
  released_at     date,
  raw             jsonb not null,
  updated_at      timestamptz not null default now()
);

create index if not exists idx_movies_score on movies (score desc nulls last);
create index if not exists idx_movies_watchers on movies (watchers desc nulls last);
create index if not exists idx_movies_plays on movies (plays desc nulls last);
create index if not exists idx_movies_list_count on movies (list_count desc nulls last);
create index if not exists idx_movies_year on movies (year desc nulls last);
create index if not exists idx_movies_released on movies (released_at desc nulls last);
create index if not exists idx_movies_genres on movies using gin (genres);
create index if not exists idx_movies_title_trgm on movies using gin (title gin_trgm_ops);

-- Migrating a database that already has the old YTS-shaped `movies`
-- table? Easiest path is dropping and recreating it, since the crawler
-- source changed entirely and old rows aren't meaningfully reusable:
--   drop table if exists movies;
-- then re-run this file and `npm run crawl:movies:full`.

-- ---------------------------------------------------------------------
-- Crawl bookkeeping — one row per source, so the background sync knows
-- what it last did without needing an external scheduler's state.
-- ---------------------------------------------------------------------

create table if not exists sync_state (
  source              text primary key,   -- 'anime' | 'movies' | ...
  last_run_at         timestamptz,
  last_full_sync_at   timestamptz,
  last_pages_crawled  integer,
  last_rows_upserted  integer,
  details             jsonb                -- per-upstream-source breakdown, e.g. {"anilist":{"pages":20,"rows":500},...}
);

alter table sync_state add column if not exists details jsonb;


