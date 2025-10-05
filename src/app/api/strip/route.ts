// app/api/strip/route.ts

/*
POST /api/strip

- Uploads a photostrip image and returns a temporary share token (10 min lifetime)
- Stores data in-memory on the server (dev only)
*/

import { NextRequest, NextResponse } from "next/server";

type Item = { dataUrl: string; expiresAt: number };
const TEN_MIN = 10 * 60 * 1000; // 10 minutes
const MAX_IMAGE_BYTES = 2_000_000; // ~2 MB limit (safe for Vercel)
const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_ITEMS = 200;

// simple in-memory store (non-persistent)
function getStore(): Map<string, Item> {
  const g = global as any;
  if (!g.__STRIP_STORE__) g.__STRIP_STORE__ = new Map<string, Item>();
  return g.__STRIP_STORE__;
}

function makeToken() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
  }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 22; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

// Parse data URL → mime + estimated byte size
function parseDataUrl(s: string) {
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64 = m[2];
  const estBytes = Math.floor((b64.length * 3) / 4);
  return { mime, estBytes };
}

export async function POST(req: NextRequest) {
  try {
    const { dataUrl } = await req.json();

    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Bad image payload" }, { status: 400 });
    }

    const info = parseDataUrl(dataUrl);
    if (!info || !ALLOWED_MIMES.has(info.mime)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    // compression-friendly warning for large base64 strings
    if (info.estBytes > MAX_IMAGE_BYTES) {
      console.warn(
        `[QR WARN] Oversized upload (${(info.estBytes / 1_000_000).toFixed(
          2
        )} MB). Recommend using JPEG or lowering quality.`
      );
      return NextResponse.json(
        {
          error:
            "Image too large. Please retry with JPEG format (smaller file size).",
        },
        { status: 413 }
      );
    }

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

    return new NextResponse(
      JSON.stringify({ token, expiresInSeconds: TEN_MIN / 1000 }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[QR ERROR]", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
