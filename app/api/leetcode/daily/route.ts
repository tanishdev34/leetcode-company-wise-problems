import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const BASE = "https://alfa-leetcode-api.onrender.com";
const CACHE_KEY = "leetcode:daily";

export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${BASE}/daily`);
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: "Failed to fetch daily problem" }, { status: 500 });
    }

    const result = {
      questionLink: data.questionLink,
      date: data.date,
      questionTitle: data.questionTitle,
      titleSlug: data.titleSlug,
      difficulty: data.difficulty,
      isPaidOnly: data.isPaidOnly,
      topicTags: data.topicTags,
      likes: data.likes,
      dislikes: data.dislikes,
      hints: data.hints,
    };

    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    try { await redis.setex(CACHE_KEY, ttl, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch daily problem" }, { status: 500 });
  }
}
