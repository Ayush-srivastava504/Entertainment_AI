# Security

This is a summary of what's already locked down in this codebase, and what
to double-check yourself before going live. Nothing here replaces a real
professional audit for a production business.

## What's already in place

**Database access**
- Every query in `lib/db.ts`, `lib/api/movies.ts`, `lib/api/anime.ts`, and
  the `crawler/*.mjs` scripts uses parameterized queries (`$1`, `$2`, …) —
  no string concatenation of user input into SQL anywhere. The one place a
  table name is interpolated (`incrementLikes` in `lib/db.ts`) maps from a
  fixed `"blog" | "quiz"` union, never from a raw string, so it can't be
  used for injection.
- `DATABASE_URL` is only ever read on the server (`lib/db.ts`, crawler
  scripts) and is never prefixed `NEXT_PUBLIC_`, so it can't leak to the
  browser bundle.

**Secrets**
- `.env` / `.env.local` are gitignored.
- `HF_TOKEN`, `REVALIDATION_SECRET`, `DATABASE_URL`, `TMDB_API_READ_ACCESS_TOKEN`
  are all server-only. Only `NEXT_PUBLIC_SITE_URL` (your own domain — not
  sensitive) is exposed to the client.
- `/api/revalidate` compares the secret with a constant-time comparison
  (`node:crypto.timingSafeEqual`) instead of `!==`, and refuses to run at
  all if `REVALIDATION_SECRET` isn't set.

**Input validation & rate limiting**
- `/api/queue`, `/api/comments`, `/api/like` all validate their inputs
  (allowed task/type enums, string length caps, JSON parse errors handled)
  and rate-limit by IP (in-memory, per server instance — see the note
  below about scaling this).
- `/api/queue/[id]` and quiz/blog/movie/anime detail routes validate the
  `id`/`slug` shape (e.g. a UUID regex for job ids) before hitting the DB.
- User-submitted content (comment author name/body) is always rendered
  through React's default JSX escaping — no `dangerouslySetInnerHTML` is
  used for anything user-supplied anywhere in the codebase. The only
  `dangerouslySetInnerHTML` calls are the JSON-LD `<script>` tags this
  project's own code generates from trusted DB content, and even those
  escape `<` to `\u003c` so a stray `</script>` in crawled text can't break
  out of the tag.

**HTTP security headers** (`next.config.js`)
- `X-Frame-Options: DENY` — blocks clickjacking via iframe embedding.
- `X-Content-Type-Options: nosniff` — blocks MIME-sniffing attacks.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` — disables camera/mic/geolocation (unused features).
- `Strict-Transport-Security` — forces HTTPS on repeat visits.

**No exposed infrastructure**
- The old EC2 instance (and its open SSH/IAM surface) has been removed
  entirely — see the README for the new architecture. There's no server
  to patch, no instance metadata endpoint, no security group to manage.
- The on-demand AI tools call `HF_SPACE_URL` server-side only
  (`lib/ai.ts`) — the Space's URL and any `HF_TOKEN` never reach the
  client.

## What to double-check yourself

- **Rate limiting is per server instance, in memory.** On Vercel, each
  serverless invocation may be a fresh instance, so this is a soft
  deterrent, not a hard guarantee. If abuse becomes a real problem, swap
  the `hits` Map pattern in `/api/queue`, `/api/comments`, `/api/like` for
  Upstash Redis or Vercel's rate-limiting middleware.
- **No authentication anywhere** (comments, likes, tool usage) — this
  matches the "anyone can post" design called out in `lib/db.ts`, but
  confirm that's actually what you want before launch. If not, likes and
  comments are the two places to add it.
- **Content moderation for comments** isn't automated. There's length
  limits and rate limiting, but nothing screens for spam/abuse content
  itself. Consider adding a moderation queue or a service like Akismet if
  the comment sections get real traffic.
- **CSP (Content-Security-Policy)** isn't set. It wasn't added by default
  because a strict policy needs to be tuned against exactly which image
  hosts (TMDB, AniList/Kitsu posters) and font/script sources you use, and
  a wrong policy silently breaks the UI. A reasonable starting point once
  you've deployed and can test against it:
  ```
  default-src 'self';
  img-src 'self' https://image.tmdb.org https://*.myanimelist.net data:;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  ```
  Add it as another entry in the `headers()` array in `next.config.js`.
- **Dependency updates**: run `npm audit` periodically — nothing here
  pins package versions against known CVEs on your behalf.
