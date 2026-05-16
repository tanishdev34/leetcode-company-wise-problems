import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const CF_API = "https://codeforces.com/api";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const cacheKey = `codeforces:user:${handle}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${CF_API}/user.info?handles=${handle}`);
    const data = await res.json();

    if (data.status !== "OK" || !data.result?.length) {
      return NextResponse.json({ error: "Codeforces user not found" }, { status: 404 });
    }

    const user = data.result[0];
    const result = {
      handle: user.handle,
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rank: user.rank ?? null,
      maxRank: user.maxRank ?? null,
      avatar: user.avatar ?? null,
      titlePhoto: user.titlePhoto ?? null,
      contribution: user.contribution ?? 0,
      lastOnlineTimeSeconds: user.lastOnlineTimeSeconds ?? null,
      registrationTimeSeconds: user.registrationTimeSeconds ?? null,
    };

    try { await redis.setex(cacheKey, CACHE_TTL.STATS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Codeforces user" }, { status: 500 });
  }
}
