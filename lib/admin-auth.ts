/*
This module handles single-admin authentication: checking the login
password against ADMIN_PASSWORD and issuing/verifying a signed session
cookie using ADMIN_SESSION_SECRET (HMAC-SHA256 via the Web Crypto API).
Web Crypto (not Node's `node:crypto`) is used deliberately so this module
works both in normal API routes (Node runtime) and in middleware.ts,
which runs in the Edge Runtime and can't load Node built-ins.

There is no user table; this is a single shared password gate for /admin
and /api/admin, matching the "one operator" scale of this project.
*/

export const ADMIN_COOKIE_NAME = "marquee_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to your environment."
    );
  }
  return secret;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string): Promise<string> {
  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set on the server.");
  }
  return safeEqual(password, expected);
}

/** Builds a `payload.signature` cookie value good for SESSION_TTL_MS. */
export async function createSessionCookieValue(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload)}`;
}

/** Verifies signature + expiry. Returns false for missing/tampered/expired cookies. */
export async function verifySessionCookieValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  try {
    if (!safeEqual(await sign(payload), signature)) return false;
  } catch {
    return false;
  }
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() < expiresAt;
}

export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
