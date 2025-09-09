// app/api/strip/route.ts

/* 
POST /api/strip

- This route is used to upload a new photostrip image and create a temporary share token

How it works:
- the client sends a POST request with JSON that includes {dataUrl}
- the server validates that it is a proper image string
- it cleans up any expired items from the in-memory store
- it generates a short random token
- it saves the image and an expiration time (10 minutes) into the store
- it responds with the token and how long the link still stay alive
- Later, the client can use GET /api/strip/[token] with that token to fetch the photo
*/

import { NextRequest, NextResponse } from "next/server";

type Item = 
{ 
    dataUrl: string; 
    expiresAt: number 
};
const TEN_MIN = 10 * 60 * 1000;       // 10 minutes
const MAX_IMAGE_BYTES = 2_000_000;    // ~ 2 MB
const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_ITEMS = 200;                // cap the in-memory store

// dev-only in-memory store that survives 
function getStore(): Map<string, Item> {
  const g = global as any;
  if (!g.__STRIP_STORE__) g.__STRIP_STORE__ = new Map<string, Item>();
  return g.__STRIP_STORE__;
}

function makeToken() {
  // short, random, unguessable token
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
  }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 22; i++) 
    out += chars[(Math.random() * chars.length) | 0];
  return out;
}

// Parse data URL, return mime + rough byte estimate
function parseDataUrl(s: string) {
  // data:image/png;base64,AAAA...
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64 = m[2];
  // base64 expands ~4/3; subtract padding is negligible here
  const estBytes = Math.floor((b64.length * 3) / 4);
  return { mime, estBytes };
}

// POST requests to /api/strip
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
    if (info.estBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 }); // Payload Too Large
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
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}