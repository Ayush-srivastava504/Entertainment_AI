-- Shared Postgres schema.
-- Vercel (Next.js) inserts rows and polls for results.
-- The EC2 batch pipeline drains "pending" rows once a day, then stops itself.
--
-- Run this once against whichever Postgres you provision (Neon / Supabase /
-- RDS — anything reachable from both Vercel and your EC2 instance's VPC).

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
-- Autonomous content tables.
--
-- Nothing here is written by a user request. Once a day,
-- pipeline/generate_content.py loads the model, picks fresh topics from
-- its own internal list, generates a blog post + a ranking + a quiz, and
-- inserts them here already published — no queue row, no human review
-- step, no request/response round trip. The frontend just reads whatever
-- is newest.
-- ---------------------------------------------------------------------

create table if not exists blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  meta_description  text not null,
  body              jsonb not null,        -- array of paragraph strings
  likes             integer not null default 0,
  published_at      timestamptz not null default now()
);

create index if not exists idx_blog_posts_published on blog_posts (published_at desc);

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

create table if not exists quizzes (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  description       text not null,
  questions         jsonb not null,  -- [{ text, options: [{ text, result }] }]
  results           jsonb not null,  -- [{ key, title, description }]
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

create table if not exists anime (
  id             text primary key,        -- Jikan mal_id
  title          text not null,
  title_english  text,
  synopsis       text,
  poster_url     text,
  trailer_url    text,
  year           integer,
  score          numeric,
  popularity     integer,                 -- lower = more popular (Jikan convention)
  rank           integer,
  episodes       integer,
  status         text,                    -- 'Currently Airing' | 'Finished Airing' | 'Not yet aired'
  type           text,                    -- TV | Movie | OVA | ...
  genres         text[] not null default '{}',
  studios        text[] not null default '{}',
  aired_from     date,
  aired_to       date,
  raw            jsonb not null,          -- full Jikan payload, for future fields without a migration
  updated_at     timestamptz not null default now()
);

create index if not exists idx_anime_score on anime (score desc nulls last);
create index if not exists idx_anime_popularity on anime (popularity asc nulls last);
create index if not exists idx_anime_year on anime (year desc nulls last);
create index if not exists idx_anime_status on anime (status);
create index if not exists idx_anime_genres on anime using gin (genres);
create index if not exists idx_anime_title_trgm on anime using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Movie catalog — populated by crawler/yts-crawler.mjs (source: YTS.mx,
-- a free, keyless movie API — used instead of TMDB, which requires an
-- API key and per-request quotas). Nothing in app/ ever calls YTS
-- directly; every page reads this table.
-- ---------------------------------------------------------------------

create table if not exists movies (
  id              text primary key,       -- YTS movie id
  imdb_code       text,
  title           text not null,
  description     text,
  poster_url      text,
  background_url  text,
  trailer_url     text,
  year            integer,
  score           numeric,                -- 0-10
  runtime         integer,                -- minutes
  genres          text[] not null default '{}',
  language        text,
  download_count  integer,                -- used as a popularity/trending proxy
  like_count      integer,
  date_uploaded   timestamptz,            -- used as a "recently added" proxy for upcoming/latest
  raw             jsonb not null,
  updated_at      timestamptz not null default now()
);

create index if not exists idx_movies_score on movies (score desc nulls last);
create index if not exists idx_movies_downloads on movies (download_count desc nulls last);
create index if not exists idx_movies_year on movies (year desc nulls last);
create index if not exists idx_movies_uploaded on movies (date_uploaded desc nulls last);
create index if not exists idx_movies_genres on movies using gin (genres);
create index if not exists idx_movies_title_trgm on movies using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Crawl bookkeeping — one row per source, so the background sync knows
-- what it last did without needing an external scheduler's state.
-- ---------------------------------------------------------------------

create table if not exists sync_state (
  source              text primary key,   -- 'jikan' | 'yts'
  last_run_at         timestamptz,
  last_full_sync_at   timestamptz,
  last_pages_crawled  integer,
  last_rows_upserted  integer
);


