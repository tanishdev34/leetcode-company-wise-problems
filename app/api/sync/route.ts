import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const BASE = "https://alfa-leetcode-api.onrender.com"

export async function POST(req: NextRequest) {
  console.error("[sync] === STARTING SYNC ===")

  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      console.log("[sync] Not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { username } = await req.json()
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 })
    }

    console.log(`[sync] User ID: ${session.user.id}, username: ${username}`)

    const res = await fetch(`${BASE}/${username}/acSubmission?limit=100`)
    console.log(`[sync] Fetch response status: ${res.status}`)

    if (!res.ok) {
      console.log("[sync] Failed to fetch from LeetCode")
      return NextResponse.json(
        { error: "Failed to fetch submissions from LeetCode" },
        { status: 500 }
      )
    }

    const data = await res.json()
    if (data.errors) {
      console.log("[sync] LeetCode user not found")
      return NextResponse.json(
        { error: "LeetCode user not found" },
        { status: 404 }
      )
    }

    const submissions: Array<{ titleSlug: string; timestamp: string }> =
      data.submission ?? []
    console.log(
      `[sync] Fetched ${submissions.length} submissions from LeetCode`
    )

    const slugMap = new Map<string, Date>()
    for (const s of submissions) {
      const url = `https://leetcode.com/problems/${s.titleSlug}`
      const solvedAt = new Date(parseInt(s.timestamp) * 1000)
      const existing = slugMap.get(url)
      if (!existing || solvedAt > existing) slugMap.set(url, solvedAt)
    }

    if (slugMap.size === 0) {
      console.log("[sync] No submissions to sync")
      return NextResponse.json({ synced: 0, matched: 0 })
    }

    const userId = session.user.id
    const questions = await prisma.question.findMany({
      where: { leetcodeUrl: { in: Array.from(slugMap.keys()) } },
      select: { id: true, leetcodeUrl: true },
    })

    console.log(`[sync] Found ${questions.length} matching questions in DB`)

    if (questions.length === 0) {
      console.log("[sync] No matching questions found in DB")
      return NextResponse.json({ synced: 0, matched: slugMap.size })
    }

    await Promise.all(
      questions.map((q) =>
        prisma.userQuestion.upsert({
          where: { userId_questionId: { userId, questionId: q.id } },
          update: {
            solved: true,
            solvedAt: slugMap.get(q.leetcodeUrl) ?? new Date(),
          },
          create: {
            userId,
            questionId: q.id,
            solved: true,
            solvedAt: slugMap.get(q.leetcodeUrl) ?? new Date(),
          },
        })
      )
    )

    console.log(
      `[sync] Sync complete: ${questions.length} synced, ${slugMap.size} matched`
    )
    return NextResponse.json({
      synced: questions.length,
      matched: slugMap.size,
    })
  } catch (error) {
    console.error("[sync] ERROR:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
