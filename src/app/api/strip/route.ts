// app/api/strip/route.ts
/*
POST /api/strip
- Accepts { dataUrl } and stores it in-memory for ~10 minutes.
- Returns { token, expiresInSeconds }.
- Includes per-IP rate limiting & basic validation.
*/

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { dataUrl: string; expiresAt: number };

const TEN_MIN = 10 * 60 * 1000;         // 10 minutes
const MAX_IMAGE_BYTES = 2_000_000;      // 2 MB cap
const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_ITEMS = 200;              

function getStore(): Map<string, Item> {
  const g = globalThis as any;
  if (!g.__STRIP_STORE__) g.__STRIP_STORE__ = new Map<string, Item>();
  return g.__STRIP_STORE__ as Map<string, Item>;
}

type RL = { count: number; windowStart: number };
function getRateMap(): Map<string, RL> {
  const g = globalThis as any;
  if (!g.__STRIP_RATE_MAP__) g.__STRIP_RATE_MAP__ = new Map<string, RL>();
  return g.__STRIP_RATE_MAP__ as Map<string, RL>;
}

// --- rate limit config (adjust as you like) ---
const MAX_POSTS_PER_WINDOW = 10;  // 10 creations per IP per window
const WINDOW_MS = 60_000;         // 60s window

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimitPost(ip: string) {
  const map = getRateMap();
  const now = Date.now();
  const key = `rl:post:${ip}`;
  const cur = map.get(key);

  if (!cur) {
    map.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: MAX_POSTS_PER_WINDOW - 1, resetMs: WINDOW_MS };
  }

  const elapsed = now - cur.windowStart;
  if (elapsed > WINDOW_MS) {
    cur.count = 1;
    cur.windowStart = now;
    return { ok: true, remaining: MAX_POSTS_PER_WINDOW - 1, resetMs: WINDOW_MS };
  }

  cur.count += 1;
  if (cur.count > MAX_POSTS_PER_WINDOW) {
    const resetMs = WINDOW_MS - elapsed;
    return { ok: false, retryAfterSec: Math.ceil(resetMs / 1000), resetMs };
  }

  return { ok: true, remaining: MAX_POSTS_PER_WINDOW - cur.count, resetMs: WINDOW_MS - elapsed };
}

// --- helpers ---
function makeToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function parseDataUrl(s: string) {
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64 = m[2];
  const estBytes = Math.floor((b64.length * 3) / 4); // base64 ≈ 4/3 inflate
  return { mime, estBytes };
}

/* ---------- Handler ---------- */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // rate limit first
  const rl = checkRateLimitPost(ip);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Retry-After": String(rl.retryAfterSec ?? 60),
        "X-RateLimit-Limit": String(MAX_POSTS_PER_WINDOW),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + (rl.resetMs ?? 0)) / 1000)),
      },
    });
  }

  // parse body
  let dataUrl: unknown;
  try {
    const body = await req.json();
    dataUrl = body?.dataUrl;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // validate image
  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "Bad image payload" }, { status: 400 });
  }
  const info = parseDataUrl(dataUrl);
  if (!info || !ALLOWED_MIMES.has(info.mime)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }
  if (info.estBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  // store with TTL
  const store = getStore();
  const now = Date.now();

  // cleanup expired
  for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);

  // cap total items (drop oldest)
  if (store.size >= MAX_ITEMS) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }

  const token = makeToken();
  store.set(token, { dataUrl, expiresAt: now + TEN_MIN });

  // best-effort cleanup for this item
  setTimeout(() => store.delete(token), TEN_MIN).unref?.();

  return new NextResponse(
    JSON.stringify({ token, expiresInSeconds: TEN_MIN / 1000 }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(MAX_POSTS_PER_WINDOW),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    }
  );
}
