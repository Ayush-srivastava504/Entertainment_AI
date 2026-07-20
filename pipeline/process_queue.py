"""
Runs once a day on EC2:
  1. Connect to the shared Postgres.
  2. Load the Qwen model (one time).
  3. Pull every 'pending' queue_jobs row, generate a result, write it back.
  4. Exit. (The systemd unit / run.sh that invoked this then stops the
     instance — see systemd/entertainment-ai-pipeline.service.)

Env vars required:
  DATABASE_URL   postgres connection string (same one Vercel uses)
Optional:
  MODEL_REPO, MODEL_FILE, LLM_N_THREADS, LLM_N_CTX  (see model.py)
  MAX_JOBS_PER_RUN   safety cap, default 200
"""
import logging
import os
import sys
import time

import psycopg2
import psycopg2.extras

from model import load_model, generate
from prompts import build_prompt, max_tokens_for, temperature_for, VALID_TASKS

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)
log = logging.getLogger("pipeline")

MAX_JOBS_PER_RUN = int(os.environ.get("MAX_JOBS_PER_RUN", "200"))


def fetch_pending(conn):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            select id, task, input
            from queue_jobs
            where status = 'pending'
            order by created_at asc
            limit %s
            """,
            (MAX_JOBS_PER_RUN,),
        )
        return cur.fetchall()


def mark_done(conn, job_id: str, result: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            update queue_jobs
            set status = 'done', result = %s, completed_at = now()
            where id = %s
            """,
            (result, job_id),
        )
    conn.commit()


def mark_failed(conn, job_id: str, error: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            update queue_jobs
            set status = 'failed', error = %s, completed_at = now()
            where id = %s
            """,
            (error[:500], job_id),
        )
    conn.commit()


def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("DATABASE_URL is not set. Aborting.")
        sys.exit(1)

    conn = psycopg2.connect(database_url)
    jobs = fetch_pending(conn)

    if not jobs:
        log.info("No pending jobs. Nothing to do.")
        conn.close()
        return

    log.info("Loading model for %d pending job(s)...", len(jobs))
    t0 = time.time()
    llm = load_model()
    log.info("Model loaded in %.1fs", time.time() - t0)

    done, failed = 0, 0
    for job in jobs:
        job_id, task, input_ = job["id"], job["task"], job["input"]
        try:
            if task not in VALID_TASKS:
                raise ValueError(f"Unknown task: {task}")
            prompt = build_prompt(task, input_)
            result = generate(
                llm,
                prompt,
                max_tokens=max_tokens_for(task),
                temperature=temperature_for(task),
            )
            mark_done(conn, job_id, result)
            done += 1
        except Exception as exc:  # noqa: BLE001 - log and keep processing the rest
            log.exception("Job %s failed", job_id)
            mark_failed(conn, job_id, str(exc))
            failed += 1

    conn.close()
    log.info("Batch run complete: %d done, %d failed.", done, failed)


if __name__ == "__main__":
    main()
