
/*
GET /api/strip/[token]
- this route lets users fetch a saved photostrip image using its unique token

How it works:
- When someone uploads a photo, server saves it in a temporary "store" (in memory)
- Each photo is linked to a short token and expiration time
- When you visit /api/strip/[token], this code:
   1. looks up photo in the store using the token
   2. if token does not exist -> return 404 (not found)
   3. if token exists but has expired -> remove it and return 410 (expired)
   4. Otherwise -> return the image's dataUrl and how many seconds are left it expires
*/

import { NextResponse } from "next/server";

type Item = 
{ 
    dataUrl: string; 
    expiresAt: number 
};
const GENERIC_404 = false; // set true to always return 404 for invalid/expired

function getStore(): Map<string, Item> {
  const g = global as any;
  return g.__STRIP_STORE__ ?? new Map<string, Item>();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }   // <- params is a Promise
) {
  const { token } = await ctx.params;         
  const store = getStore();
  const item = store.get(token);
  const now = Date.now();

  if (!item) {
    // no photo saved for this token
    const status = 404;
     const body = GENERIC_404 ? { error: "Not found" } : { error: "Not found or expired" };
     return new NextResponse(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  if (item.expiresAt <= now) {
    // photo exists but is too old -> delete and return "expired"
    store.delete(token);
    const status = GENERIC_404 ? 404 : 410;
    const body = GENERIC_404 ? { error: "Not found" } : { error: "Expired" };
    return new NextResponse(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

    // success -> returns the image and how many seconds are left before it disappears
  const expiresInSeconds = Math.max(0, Math.floor((item.expiresAt - now) / 1000));
  return new NextResponse(JSON.stringify({ dataUrl: item.dataUrl, expiresInSeconds }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
