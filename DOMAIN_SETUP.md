# Attaching a new domain

Short answer: **yes, one env var is really all that's needed** — the code
already reads `NEXT_PUBLIC_SITE_URL` everywhere an absolute URL matters
(sitemap, robots.txt, canonical links, Open Graph tags, JSON-LD). Nothing
else in the codebase hardcodes a domain.

## Steps

1. **Vercel → Project Settings → Domains → Add.** Enter your domain
   (e.g. `example.com` and/or `www.example.com`).
2. **DNS**: at your registrar (Cloudflare Registrar, Namecheap, Porkbun,
   wherever you bought it), add whatever record Vercel's Domains page
   tells you to — usually:
   - Apex domain (`example.com`): an `A` record to Vercel's IP, or Vercel's
     "ALIAS"/"ANAME" option if your DNS provider supports it.
   - Subdomain (`www.example.com`): a `CNAME` to `cname.vercel-dns.com`.
   Vercel's UI shows the exact record for your specific domain — follow
   that over generic instructions, since it varies by whether you're using
   the apex or a subdomain.
3. **Update `NEXT_PUBLIC_SITE_URL`** in Vercel → Project Settings →
   Environment Variables to your new domain, e.g. `https://example.com`
   (no trailing slash). Redeploy (Vercel does this automatically on env
   var changes triggering a new deployment, or trigger one manually).
4. Wait for DNS propagation and Vercel's automatic SSL certificate
   (usually minutes, occasionally up to ~48h for DNS).

That's it — no code changes, no other services to reconfigure.

## What you do NOT need to touch

- `HF_SPACE_URL` / `HF_TOKEN` — the Hugging Face Space doesn't care what
  domain calls it; it's called server-to-server from your API routes.
- `DATABASE_URL` — Postgres has no concept of your frontend's domain.
- `TMDB_API_READ_ACCESS_TOKEN` — TMDB doesn't restrict by referring domain
  for this token type.
- GitHub Actions secrets (`DATABASE_URL`, `TMDB_API_READ_ACCESS_TOKEN`,
  `AI_SUMMARY_ENDPOINT`) — the crawler workflow doesn't run on your domain
  at all, so it's unaffected.

## If you also want the old domain to redirect

If you're moving off a previous domain rather than just adding a new one,
add the old domain in Vercel too and set it to redirect to the new one
(Vercel's Domains UI has a "Redirect to" option per domain) — this
preserves any inbound links/SEO rather than just letting the old domain
404.

## Verify after switching

- Visit `/sitemap.xml` and `/robots.txt` on the new domain and confirm the
  URLs inside use the new domain, not `https://example.com` (the
  fallback value used only when `NEXT_PUBLIC_SITE_URL` isn't set).
- Spot check a movie/anime/quiz detail page's Open Graph tags (e.g. via
  https://www.opengraph.xyz/) to confirm the canonical URL and images
  resolve on the new domain.
