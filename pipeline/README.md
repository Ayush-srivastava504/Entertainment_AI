# Daily batch pipeline (EC2 t2.micro)

How this replaces "always-on model server":

```
[EventBridge Scheduler]  -- daily, e.g. 03:00 UTC --> starts the stopped EC2 instance
        |
[EC2 boots] -- systemd runs pipeline/run.sh on boot -->
        |
[process_queue.py] loads Qwen once, drains every 'pending' row in queue_jobs,
        writes result/failed back to Postgres
        |
[run.sh] calls `aws ec2 stop-instances` on itself -- instance goes back to $0 compute
        |
[Vercel frontend] never talks to EC2 directly — it only reads/writes Postgres.
Users who submitted a tool request see "queued" until their row flips to 'done'.
```

The instance is stopped (not terminated) between runs, so the EBS volume,
model cache, and installed deps persist — each run after the first just
re-downloads nothing and boots fast.

## 0. Know the constraint you're accepting

A t2.micro has **1 vCPU (burstable) and 1GB RAM**. A 1.5B q4 GGUF model
(~1GB on disk) plus a small context window fits, but it's tight — expect
slow generation (CPU-only, single thread) and add a swap file (step 2) so
the OOM killer doesn't take out the process mid-run. If you queue up a lot
of jobs in a day, the run will just take longer, not fail — there's no
request timeout here like there was on Vercel.

If it turns out too tight in practice, dropping to `Qwen2.5-0.5B-Instruct-GGUF`
(set `MODEL_FILE`/`MODEL_REPO` env vars) is the easy lever.

## 1. Provision Postgres (shared between EC2 and Vercel)

Any Postgres reachable from both sides works. **Neon** or **Supabase** free
tier are the easiest — no VPC networking to fight with, unlike RDS.

1. Create a free Postgres project (Neon: neon.tech, Supabase: supabase.com).
2. Copy the connection string — you'll set it as `DATABASE_URL` in two
   places: Vercel's env vars, and `pipeline/.env` on the EC2 box.
3. Run the schema once:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

## 2. Launch the EC2 instance

1. **Launch instance** → Ubuntu 22.04 LTS → `t2.micro`.
2. Add a swap file (1.5B model + 1GB RAM leaves no headroom):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. Install deps:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-pip python3-venv build-essential git awscli
   ```
4. Get the code onto the box (clone your GitHub repo, or `scp` the
   `pipeline/` folder):
   ```bash
   git clone https://github.com/<you>/entertainment-ai.git
   cd entertainment-ai/pipeline
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
5. Create `pipeline/.env` (systemd loads this via `EnvironmentFile`):
   ```
   DATABASE_URL=postgres://...        # same value as Vercel's DATABASE_URL
   MODEL_REPO=Qwen/Qwen2.5-1.5B-Instruct-GGUF
   MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
   LLM_N_THREADS=1
   LLM_N_CTX=2048
   ```
6. `chmod +x run.sh`

## 3. Run it once by hand to sanity check

```bash
source venv/bin/activate
./run.sh
```
Watch it: it should load the model, print `0 done` if the queue's empty
(that's fine — queue a test job from the live site first if you want to see
a real one process), then call `aws ec2 stop-instances` — which will fail
here with a permissions error until step 4 is done. That's expected; fix
the IAM role, then it'll actually stop itself on the *scheduled* runs.

## 4. IAM role so the instance can stop itself

The instance needs permission to call `ec2:StopInstances` on **itself only**.

1. IAM → Roles → **Create role** → AWS service → EC2.
2. Attach an inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "ec2:StopInstances",
         "Resource": "arn:aws:ec2:<region>:<account-id>:instance/<instance-id>"
       }
     ]
   }
   ```
3. EC2 console → select your instance → **Actions → Security → Modify IAM role**
   → attach the role you just created.

## 5. Auto-run on every boot (systemd)

```bash
sudo cp pipeline/systemd/entertainment-ai-pipeline.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable entertainment-ai-pipeline.service
```
Now every time the instance boots, it runs the batch and stops itself —
no cron needed on the box.

## 6. Schedule the daily start (EventBridge Scheduler)

This is what turns the instance back on once a day (it's stopped the rest
of the time, so nothing else will start it).

1. Amazon EventBridge → **Scheduler** → **Create schedule**.
2. Recurring schedule, cron expression, e.g. `0 3 * * ? *` (03:00 UTC daily).
3. Target: **AWS API call** → service `EC2`, action `StartInstances`,
   instance ID = your instance.
4. Scheduler needs its own execution role with `ec2:StartInstances` on that
   same instance ARN — the console will offer to create this role for you.

That's the whole loop: Scheduler starts it → systemd runs the batch on boot
→ script stops it → repeat tomorrow.

## 7. Point Vercel at the same database

In the Next.js project (Vercel → Project Settings → Environment Variables):
```
DATABASE_URL=postgres://...   # same connection string as pipeline/.env
```
That's the only env var the frontend needs now — `HF_TOKEN`/`HF_SPACE_URL`
are no longer used anywhere (the old `/api/generate` route and `lib/hf.ts`
have been removed; everything goes through `/api/queue` → Postgres now).

## 8. Test end to end

1. Deploy the frontend to Vercel.
2. Submit any tool (e.g. tag generator) — you should see the "⏳ queued"
   state and a job id.
3. Manually trigger the EventBridge schedule (or just start the instance
   by hand and let systemd run) to process it early.
4. Reload the tool's page — `ToolShell` remembers the job id in
   `localStorage` and will show the result once `status = 'done'`.
