/*
GET /api/strip/[token]
- fetch a saved photostrip by token
- in-memory temp store + per-IP rate limit on this GET

Notes:
- This is fine for dev, not production (serverless instances won't share memory).
- For prod, move storage + rate counters to KV/Redis.
*/

import { NextResponse } from "next/server";

// Force Node (globals won't persist on Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { dataUrl: string; expiresAt: number };
const GENERIC_404 = false; // set true to always return 404 for invalid/expired

// Photostrip store (token -> Item)
function getStore(): Map<string, Item> {
  const g = globalThis as any;
  if (!g.__STRIP_STORE__) g.__STRIP_STORE__ = new Map<string, Item>();
  return g.__STRIP_STORE__ as Map<string, Item>;
}

// Simple per-IP fixed-window rate limiter (GET only)
type RL = { count: number; windowStart: number };
function getRateMap(): Map<string, RL> {
  const g = globalThis as any;
  if (!g.__STRIP_RATE_MAP__) g.__STRIP_RATE_MAP__ = new Map<string, RL>();
  return g.__STRIP_RATE_MAP__ as Map<string, RL>;
}

const RATE_LIMIT_MAX = 60;          // testing: 3 requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // testing: 10s window

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string) {
  const map = getRateMap();
  const now = Date.now();
  const key = `rl:get:${ip}`;
  const current = map.get(key);

  if (!current) {
    map.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  const elapsed = now - current.windowStart;
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    current.count = 1;
    current.windowStart = now;
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    const resetMs = RATE_LIMIT_WINDOW_MS - elapsed;
    return { ok: false, retryAfterSec: Math.ceil(resetMs / 1000), resetMs };
  }

  const resetMs = RATE_LIMIT_WINDOW_MS - elapsed;
  return { ok: true, remaining: RATE_LIMIT_MAX - current.count, resetMs };
}

// Normalize ctx.params whether it's an object or a Promise (some Next versions)
async function normalizeParams(
  ctx:
    | { params: { token: string } }
    | { params: Promise<{ token: string }> }
): Promise<{ token?: string }> {
  const p: any = (ctx as any)?.params;
  if (p && typeof p.then === "function") return await p;
  return p ?? {};
}

/* ---------- Handler ---------- */

export async function GET(
  req: Request,
  ctx:
    | { params: { token: string } }
    | { params: Promise<{ token: string }> }
) {
  // Rate limit by IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Retry-After": String(rl.retryAfterSec ?? 60),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + (rl.resetMs ?? 0)) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  // Handle params whether object or promise
  const { token } = await normalizeParams(ctx);
  if (!token) {
    return new NextResponse(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const store = getStore();
  const item = store.get(token);
  const now = Date.now();

  // Not found at all
  if (!item) {
    const body = GENERIC_404 ? { error: "Not found" } : { error: "Not found or expired" };
    return new NextResponse(JSON.stringify(body), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    });
  }

  // Found but expired
  if (item.expiresAt <= now) {
    store.delete(token);
    const status = GENERIC_404 ? 404 : 410;
    const body = GENERIC_404 ? { error: "Not found" } : { error: "Expired" };
    return new NextResponse(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    });
  }

  // Success
  const expiresInSeconds = Math.max(0, Math.floor((item.expiresAt - now) / 1000));
  return new NextResponse(
    JSON.stringify({ dataUrl: item.dataUrl, expiresInSeconds }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, rl.remaining ?? 0)),
      },
    }
  );
}
