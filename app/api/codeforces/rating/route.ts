import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const CF_API = "https://codeforces.com/api";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const cacheKey = `codeforces:rating:${handle}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${CF_API}/user.rating?handle=${handle}`);
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json({ error: "Failed to fetch rating history" }, { status: 404 });
    }

    const ratingHistory = data.result.map((entry: any) => ({
      contestId: entry.contestId,
      contestName: entry.contestName,
      rank: entry.rank,
      oldRating: entry.oldRating,
      newRating: entry.newRating,
      ratingUpdateTimeSeconds: entry.ratingUpdateTimeSeconds,
    }));

    const result = { ratingHistory };

    try { await redis.setex(cacheKey, CACHE_TTL.STATS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rating history" }, { status: 500 });
  }
}
