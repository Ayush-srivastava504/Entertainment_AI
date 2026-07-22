/*
This SQL schema defines the complete Postgres database for the application,
including tables for queue jobs, blog posts, rankings, quizzes, comments,
chat messages, anime, movies, and sync state. It includes indexes for
performance and is designed to be run once against any Postgres instance.
*/

create extension if not exists pgcrypto;

create table if not exists queue_jobs (
  id          uuid primary key default gen_random_uuid(),
  task        text not null,
  input       jsonb not null,
  status      text not null default 'pending',
  result      text,
  error       text,
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_queue_jobs_status on queue_jobs (status);
create index if not exists idx_queue_jobs_created on queue_jobs (created_at desc);

create table if not exists blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  meta_description  text not null,
  body              jsonb not null,
  category          text,
  tags              text[] not null default '{}',
  source_name       text,
  source_url        text unique,
  likes             integer not null default 0,
  published_at      timestamptz not null default now()
);

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
  category          text not null,
  slug              text unique not null,
  title             text not null,
  meta_description  text not null,
  intro             text not null,
  items             jsonb not null,
  published_at      timestamptz not null default now()
);

create index if not exists idx_rankings_category on rankings (category, published_at desc);

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

create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  content_type  text not null,
  content_slug  text not null,
  author_name   text not null,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_lookup on comments (content_type, content_slug, created_at desc);

create table if not exists chat_messages (
  id            uuid primary key default gen_random_uuid(),
  author_name   text not null,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_chat_messages_created on chat_messages (created_at desc);

create extension if not exists pg_trgm;

create table if not exists anime (
  id             text primary key,
  title          text not null,
  title_english  text,
  synopsis       text,
  poster_url     text,
  trailer_url    text,
  year           integer,
  score          numeric,
  popularity     integer,
  rank           integer,
  episodes       integer,
  status         text,
  type           text,
  genres         text[] not null default '{}',
  studios        text[] not null default '{}',
  aired_from     date,
  aired_to       date,
  raw            jsonb not null,
  source         text not null default 'jikan',
  updated_at     timestamptz not null default now()
);

alter table anime add column if not exists source text not null default 'jikan';

create index if not exists idx_anime_score on anime (score desc nulls last);
create index if not exists idx_anime_popularity on anime (popularity asc nulls last);
create index if not exists idx_anime_year on anime (year desc nulls last);
create index if not exists idx_anime_status on anime (status);
create index if not exists idx_anime_genres on anime using gin (genres);
create index if not exists idx_anime_title_trgm on anime using gin (title gin_trgm_ops);
create index if not exists idx_anime_source on anime (source);

create table if not exists movies (
  id              text primary key,
  imdb_code       text,
  tmdb_id         text,
  slug            text,
  title           text not null,
  tagline         text,
  description     text,
  poster_url      text,
  background_url  text,
  trailer_url     text,
  year            integer,
  score           numeric,
  runtime         integer,
  genres          text[] not null default '{}',
  language        text,
  watchers        integer,
  plays           integer,
  list_count      integer,
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

create table if not exists sync_state (
  source              text primary key,
  last_run_at         timestamptz,
  last_full_sync_at   timestamptz,
  last_pages_crawled  integer,
  last_rows_upserted  integer,
  details             jsonb
);

alter table sync_state add column if not exists details jsonb;