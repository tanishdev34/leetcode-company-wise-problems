import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const cacheKey = `leetcode:submissions:${username}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${BASE}/${username}/acSubmission`);
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    const result = {
      count: data.count,
      submissions: data.submission,
    };

    try { await redis.setex(cacheKey, CACHE_TTL.SUBMISSIONS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
