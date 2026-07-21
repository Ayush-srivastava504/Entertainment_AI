"""
Runs once a day, in the same EC2 batch as process_queue.py: generates fresh
blog posts, movie/anime rankings, and quizzes with NO user request behind
any of it, and inserts them into Postgres already published.

Flow:
  1. Connect to Postgres, load the set of slugs already used per table.
  2. Load the model (reuses the same one process_queue.py loads).
  3. For each content type, pick topics from content_prompts.py's pools
     that don't have a row yet, generate strict-JSON output, parse it
     defensively, and insert as already-published (no draft/review step).
  4. One bad item logs and is skipped -- it never aborts the whole run.

Env vars:
  DATABASE_URL             required (same one process_queue.py uses)
Optional (defaults produce 1 new item of each type per day -- a t2.micro
running a 1.5B model can comfortably do this in one run):
  BLOG_POSTS_PER_RUN        default 1
  MOVIE_RANKINGS_PER_RUN    default 1
  ANIME_RANKINGS_PER_RUN    default 1
  QUIZZES_PER_RUN           default 1
"""
import json
import logging
import os
import sys

import psycopg2

from model import load_model, generate
from content_prompts import (
    BLOG_TOPICS,
    MOVIE_RANKING_TOPICS,
    ANIME_RANKING_TOPICS,
    QUIZ_TOPICS,
    blog_prompt,
    ranking_prompt,
    quiz_prompt,
    extract_json_object,
    slugify,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)
log = logging.getLogger("content-pipeline")

BLOG_N = int(os.environ.get("BLOG_POSTS_PER_RUN", "1"))
MOVIE_N = int(os.environ.get("MOVIE_RANKINGS_PER_RUN", "1"))
ANIME_N = int(os.environ.get("ANIME_RANKINGS_PER_RUN", "1"))
QUIZ_N = int(os.environ.get("QUIZZES_PER_RUN", "1"))


# ---------------------------------------------------------------------
# Topic picking: walk the pool in order, skip anything whose slug is
# already in the DB. Once every topic in a pool has been used at least
# once, start recycling it with a "(Redux N)" suffix -- new slug, same
# underlying topic -- rather than ever blocking on "no new topics left".
# ---------------------------------------------------------------------
def pick_topics(pool, used_slugs: set, n: int):
    picks = []
    idx = 0
    round_no = 0
    guard = 0
    while len(picks) < n and guard < len(pool) * 10:
        topic = pool[idx % len(pool)]
        label = topic if round_no == 0 else f"{topic} (Redux {round_no})"
        slug = slugify(label)
        if slug not in used_slugs:
            picks.append((label, slug))
            used_slugs.add(slug)
        idx += 1
        guard += 1
        if idx % len(pool) == 0:
            round_no += 1
    return picks


def existing_slugs(conn, table: str) -> set:
    with conn.cursor() as cur:
        cur.execute(f"select slug from {table}")
        return {row[0] for row in cur.fetchall()}


# ---------------------------------------------------------------------
# One generator per content type. Each: build prompt -> call model ->
# parse JSON -> validate the shape -> insert already-published.
# `on conflict do nothing` makes inserts idempotent if a slug races.
# ---------------------------------------------------------------------
def generate_blog_post(llm, conn, label: str, slug: str):
    raw = generate(llm, blog_prompt(label), max_tokens=900, temperature=0.85)
    data = json.loads(extract_json_object(raw))
    title = data.get("title") or label
    meta = (data.get("meta_description") or "")[:160]
    body = data.get("body")
    if not isinstance(body, list) or not body:
        raise ValueError("blog response missing a valid 'body' array")

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into blog_posts (slug, title, meta_description, body)
            values (%s, %s, %s, %s::jsonb)
            on conflict (slug) do nothing
            """,
            (slug, title, meta, json.dumps(body)),
        )
    conn.commit()


def generate_ranking(llm, conn, category: str, label: str, slug: str):
    raw = generate(
        llm, ranking_prompt(category, label), max_tokens=800, temperature=0.8
    )
    data = json.loads(extract_json_object(raw))
    title = data.get("title") or label
    meta = (data.get("meta_description") or "")[:160]
    intro = data.get("intro") or ""
    items = data.get("items")
    if not isinstance(items, list) or len(items) < 3:
        raise ValueError("ranking response missing a valid 'items' array")

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into rankings (category, slug, title, meta_description, intro, items)
            values (%s, %s, %s, %s, %s, %s::jsonb)
            on conflict (slug) do nothing
            """,
            (category, slug, title, meta, intro, json.dumps(items)),
        )
    conn.commit()


def generate_quiz(llm, conn, label: str, slug: str):
    raw = generate(llm, quiz_prompt(label), max_tokens=1400, temperature=0.8)
    data = json.loads(extract_json_object(raw))
    description = data.get("description") or ""
    results = data.get("results")
    questions = data.get("questions")
    if not isinstance(results, list) or not results:
        raise ValueError("quiz response missing a valid 'results' array")
    if not isinstance(questions, list) or not questions:
        raise ValueError("quiz response missing a valid 'questions' array")

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into quizzes (slug, title, description, questions, results)
            values (%s, %s, %s, %s::jsonb, %s::jsonb)
            on conflict (slug) do nothing
            """,
            (slug, label, description, json.dumps(questions), json.dumps(results)),
        )
    conn.commit()


def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("DATABASE_URL is not set. Aborting.")
        sys.exit(1)

    conn = psycopg2.connect(database_url)

    blog_jobs = pick_topics(BLOG_TOPICS, existing_slugs(conn, "blog_posts"), BLOG_N)
    ranking_slugs = existing_slugs(conn, "rankings")
    movie_jobs = pick_topics(MOVIE_RANKING_TOPICS, ranking_slugs, MOVIE_N)
    anime_jobs = pick_topics(ANIME_RANKING_TOPICS, ranking_slugs, ANIME_N)
    quiz_jobs = pick_topics(QUIZ_TOPICS, existing_slugs(conn, "quizzes"), QUIZ_N)

    total_planned = len(blog_jobs) + len(movie_jobs) + len(anime_jobs) + len(quiz_jobs)
    if total_planned == 0:
        log.info("Nothing to generate this run.")
        conn.close()
        return

    log.info("Loading model for %d item(s) to generate...", total_planned)
    llm = load_model()

    done = failed = 0

    for label, slug in blog_jobs:
        try:
            generate_blog_post(llm, conn, label, slug)
            log.info("blog: published '%s' (%s)", label, slug)
            done += 1
        except Exception:
            log.exception("blog: failed on '%s' (%s)", label, slug)
            failed += 1

    for label, slug in movie_jobs:
        try:
            generate_ranking(llm, conn, "movie", label, slug)
            log.info("movie ranking: published '%s' (%s)", label, slug)
            done += 1
        except Exception:
            log.exception("movie ranking: failed on '%s' (%s)", label, slug)
            failed += 1

    for label, slug in anime_jobs:
        try:
            generate_ranking(llm, conn, "anime", label, slug)
            log.info("anime ranking: published '%s' (%s)", label, slug)
            done += 1
        except Exception:
            log.exception("anime ranking: failed on '%s' (%s)", label, slug)
            failed += 1

    for label, slug in quiz_jobs:
        try:
            generate_quiz(llm, conn, label, slug)
            log.info("quiz: published '%s' (%s)", label, slug)
            done += 1
        except Exception:
            log.exception("quiz: failed on '%s' (%s)", label, slug)
            failed += 1

    conn.close()
    log.info("Content run complete: %d published, %d failed.", done, failed)


if __name__ == "__main__":
    main()
