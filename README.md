# Marquee — AI Entertainment Platform (starter)

Next.js 14 (App Router, TypeScript, Tailwind) frontend, deployed on Vercel.
There is **no live model call in the request path**. Instead:

```
User submits a tool  →  Vercel writes a row to Postgres (status: pending)
                      →  page shows "queued", remembers the job id locally
                      →  once a day, an EC2 t2.micro spins up, loads Qwen,
                         drains every pending row, writes results back,
                         then stops itself
                      →  next time the user opens that page, ToolShell
                         polls the job id and shows the result
```

This trades instant answers for near-zero compute cost: the model only
runs for a few minutes once a day instead of sitting idle waiting for
requests (which is what both the free HF Inference API and an always-on
HF Space or Render service do).

```
entertainment-ai/
├── app/
│   ├── page.tsx                     # homepage
│   ├── movies/page.tsx              # 🎬 movie recommender
│   ├── anime/page.tsx               # 🍥 anime finder
│   ├── stories/page.tsx             # 📖 story generator
│   ├── quiz/page.tsx                # 🧠 quiz question generator
│   ├── tools/tag-generator/page.tsx # 🏷 tag generator
│   ├── tools/thumbnail-rating/page.tsx # 🖼 thumbnail rating
│   └── api/queue/                   # POST to queue a job, GET to poll it
├── components/
│   ├── Nav.tsx / Footer.tsx
│   └── ToolShell.tsx                # shared form + queued/result UI
├── lib/
│   ├── db.ts                        # Postgres client (server-only)
│   └── prompts.ts                   # one prompt template per tool
├── db/schema.sql                    # queue_jobs table
└── pipeline/                        # the EC2 batch job — see pipeline/README.md
```

> Superseded: `hf-space/` (a HF Space serving the model live) is no longer
> used by this setup — it's left in the repo in case you ever want to go
> back to live generation instead of the batch queue. The active backend
> is `pipeline/`.

## 1. Run the frontend locally

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL — see "Set up the backend" below
npm run dev
# → http://localhost:3000
```

Locally, tools will queue jobs into whatever Postgres `DATABASE_URL` points
at. Nothing processes them until the pipeline runs (either your own EC2 box,
or run `pipeline/process_queue.py` on your own machine against the same DB
while testing).

## 2. Set up the backend (Postgres + EC2 batch pipeline)

Full step-by-step: **[`pipeline/README.md`](./pipeline/README.md)**.

Short version:
1. Create a free Postgres (Neon or Supabase), run `db/schema.sql` against it.
2. Launch a `t2.micro`, install the pipeline, and make it stop itself after
   each run (IAM role + `run.sh`).
3. Schedule a daily start via EventBridge Scheduler.
4. Put the same `DATABASE_URL` in Vercel's env vars.

## 3. Deploy the frontend to Vercel

```bash
npm i -g vercel
vercel
```
Add `DATABASE_URL` in Project Settings → Environment Variables — it's the
only one the frontend needs now.

**Custom domain:** Project Settings → Domains → add your domain, then point
its DNS at Vercel (usually a CNAME to `cname.vercel-dns.com` or the A record
Vercel gives you). Buy the domain anywhere (Cloudflare Registrar, Namecheap,
Porkbun, etc.) — Vercel doesn't require you to buy it from them.

## 4. Add more tools

Every tool follows the same shape:
1. Add a case to `buildPrompt()` in `lib/prompts.ts` **and** the matching
   branch in `pipeline/prompts.py` (they must stay in sync — the frontend
   builds the job, the pipeline builds the prompt it actually runs).
2. Add the task name to `VALID_TASKS` in `app/api/queue/route.ts`.
3. Add a page that renders `<ToolShell task="..." buildInput={...} />`.

No new backend, no new model — same one model, one more prompt, same queue.
