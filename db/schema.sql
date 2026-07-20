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
