import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `leetcode:stats:${username}`;

  if (!refresh) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  try {
    const [solvedRes, contestRes, skillRes] = await Promise.all([
      fetch(`${BASE}/${username}/solved`),
      fetch(`${BASE}/${username}/contest`),
      fetch(`${BASE}/${username}/skill`),
    ]);

    const [solved, contest, skill] = await Promise.all([
      solvedRes.json(),
      contestRes.json(),
      skillRes.json(),
    ]);

    if (solved.errors || contest.errors || skill.errors) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    const result = { solved, contest, skill };
    try { await redis.setex(cacheKey, CACHE_TTL.STATS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
