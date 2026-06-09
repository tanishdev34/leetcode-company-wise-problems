import { NextRequest, NextResponse } from "next/server"
import { redis, CACHE_TTL } from "@/lib/redis"

const BASE = "https://alfa-leetcode-api.onrender.com"

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")
  if (!username)
    return NextResponse.json({ error: "Missing username" }, { status: 400 })

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `leetcode:calendar:${username}`;

  if (!refresh) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(cached)
    } catch {}
  }

  try {
    const res = await fetch(`${BASE}/${username}/calendar`)
    const data = await res.json()

    if (data.errors) {
      return NextResponse.json(
        { error: "LeetCode user not found" },
        { status: 404 }
      )
    }

    // The upstream API returns submissionCalendar as a JSON string — parse it
    let submissionCalendar: Record<string, number>
    if (typeof data.submissionCalendar === "string") {
      try {
        submissionCalendar = JSON.parse(data.submissionCalendar)
      } catch {
        submissionCalendar = {}
      }
    } else if (
      typeof data.submissionCalendar === "object" &&
      data.submissionCalendar !== null
    ) {
      submissionCalendar = data.submissionCalendar
    } else {
      submissionCalendar = {}
    }

    const result = {
      activeYears: data.activeYears,
      streak: data.streak,
      totalActiveDays: data.totalActiveDays,
      submissionCalendar,
    }

    try {
      await redis.setex(cacheKey, CACHE_TTL.CALENDAR, result)
    } catch {}

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    )
  }
}
