/*
GET /api/strip/[token]
- fetch a saved photostrip by token
- in-memory temp store + per-IP rate limit on this GET

Notes:
- This is fine for dev, not production (serverless instances won't share memory).
- For prod, move storage + rate counters to KV/Redis.
*/


import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { dataUrl: string; expiresAt: number };
const GENERIC_404 = false;

// ---- in-memory stores (dev only)
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

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string) {
  const map = getRateMap();
  const now = Date.now();
  const key = `rl:get:${ip}`;
  const cur = map.get(key);

  if (!cur) {
    map.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  const elapsed = now - cur.windowStart;
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    cur.count = 1;
    cur.windowStart = now;
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  cur.count += 1;
  if (cur.count > RATE_LIMIT_MAX) {
    const resetMs = RATE_LIMIT_WINDOW_MS - elapsed;
    return { ok: false, retryAfterSec: Math.ceil(resetMs / 1000), resetMs };
  }

  return { ok: true, remaining: RATE_LIMIT_MAX - cur.count, resetMs: RATE_LIMIT_WINDOW_MS - elapsed };
}

// Normalize ctx.params whether it's an object or a Promise (runtime-safe)
async function normalizeParams(ctx: any): Promise<{ token?: string }> {
  const p = ctx?.params;
  if (p && typeof p.then === "function") return await p; // Promise case (some Next versions during dev)
  return p ?? {};
}

/* ---------- Handler ---------- */

export async function GET(req: Request, ctx: any) {
  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Retry-After": String(rl.retryAfterSec ?? 60),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + (rl.resetMs ?? 0)) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const { token } = await normalizeParams(ctx);
  if (!token) {
    return NextResponse.json({ error: "Bad request" }, {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const store = getStore();
  const item = store.get(token);
  const now = Date.now();

  if (!item) {
    const body = GENERIC_404 ? { error: "Not found" } : { error: "Not found or expired" };
    return NextResponse.json(body, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    });
  }

  if (item.expiresAt <= now) {
    store.delete(token);
    const status = GENERIC_404 ? 404 : 410;
    const body = GENERIC_404 ? { error: "Not found" } : { error: "Expired" };
    return NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    });
  }

  const expiresInSeconds = Math.max(0, Math.floor((item.expiresAt - now) / 1000));
  return NextResponse.json(
    { dataUrl: item.dataUrl, expiresInSeconds },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    }
  );
}