import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Difficulty } from "@/generated/prisma/client"

const BASE = "https://alfa-leetcode-api.onrender.com"

type SelectResponse = {
  questionTitle?: string
  link?: string
  difficulty?: string
  topicTags?: Array<{ name: string }>
  errors?: unknown
}

async function fetchQuestionDetails(titleSlug: string): Promise<{
  title: string
  leetcodeUrl: string
  difficulty: Difficulty
  topics: string[]
} | null> {
  try {
    const res = await fetch(`${BASE}/select?titleSlug=${titleSlug}`)
    if (!res.ok) return null
    const data: SelectResponse = await res.json()
    if (data.errors || !data.questionTitle || !data.difficulty) return null

    const diff = data.difficulty.toUpperCase()
    if (!["EASY", "MEDIUM", "HARD"].includes(diff)) return null

    return {
      title: data.questionTitle,
      leetcodeUrl:
        data.link ?? `https://leetcode.com/problems/${titleSlug}`,
      difficulty: diff as Difficulty,
      topics: (data.topicTags ?? []).map((t) => t.name).filter(Boolean),
    }
  } catch (err) {
    console.error(`[sync] Failed to fetch details for ${titleSlug}:`, err)
    return null
  }
}

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

    const isAdmin = session.user.role === "admin"
    console.log(
      `[sync] User ID: ${session.user.id}, username: ${username}, admin: ${isAdmin}`
    )

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

    const submissions: Array<{
      titleSlug: string
      timestamp: string
    }> = data.submission ?? []
    console.log(
      `[sync] Fetched ${submissions.length} submissions from LeetCode`
    )

    const slugToSolvedAt = new Map<string, Date>()
    const urlToSlug = new Map<string, string>()
    for (const s of submissions) {
      const url = `https://leetcode.com/problems/${s.titleSlug}`
      const solvedAt = new Date(parseInt(s.timestamp) * 1000)
      const existing = slugToSolvedAt.get(s.titleSlug)
      if (!existing || solvedAt > existing)
        slugToSolvedAt.set(s.titleSlug, solvedAt)
      urlToSlug.set(url, s.titleSlug)
    }

    if (slugToSolvedAt.size === 0) {
      console.log("[sync] No submissions to sync")
      return NextResponse.json({ synced: 0, matched: 0, imported: 0 })
    }

    const userId = session.user.id
    const allUrls = Array.from(urlToSlug.keys())
    const existing = await prisma.question.findMany({
      where: { leetcodeUrl: { in: allUrls } },
      select: { id: true, leetcodeUrl: true },
    })

    console.log(
      `[sync] Found ${existing.length}/${allUrls.length} matching questions in DB`
    )

    const existingUrls = new Set(existing.map((q) => q.leetcodeUrl))
    const missingUrls = allUrls.filter((u) => !existingUrls.has(u))

    let imported = 0
    const importedQuestions: Array<{ id: string; leetcodeUrl: string }> = []

    if (isAdmin && missingUrls.length > 0) {
      console.log(
        `[sync] Admin: importing ${missingUrls.length} missing questions`
      )
      const missingSlugs = missingUrls
        .map((u) => urlToSlug.get(u))
        .filter((s): s is string => Boolean(s))

      const detailsList = await Promise.all(
        missingSlugs.map((slug) => fetchQuestionDetails(slug))
      )

      for (const details of detailsList) {
        if (!details) continue
        try {
          const q = await prisma.question.upsert({
            where: { leetcodeUrl: details.leetcodeUrl },
            update: {},
            create: {
              title: details.title,
              leetcodeUrl: details.leetcodeUrl,
              difficulty: details.difficulty,
              topics: details.topics,
              acceptanceRate: 0,
            },
            select: { id: true, leetcodeUrl: true },
          })
          importedQuestions.push(q)
          imported++
        } catch (err) {
          console.error(
            `[sync] Failed to upsert imported question ${details.leetcodeUrl}:`,
            err
          )
        }
      }
    }

    const allQuestions = [...existing, ...importedQuestions]

    if (allQuestions.length === 0) {
      console.log("[sync] No questions to mark solved")
      return NextResponse.json({
        synced: 0,
        matched: slugToSolvedAt.size,
        imported,
      })
    }

    await Promise.all(
      allQuestions.map((q) => {
        const slug = urlToSlug.get(q.leetcodeUrl)
        const solvedAt =
          (slug && slugToSolvedAt.get(slug)) ?? new Date()
        return prisma.userQuestion.upsert({
          where: { userId_questionId: { userId, questionId: q.id } },
          update: { solved: true, solvedAt },
          create: {
            userId,
            questionId: q.id,
            solved: true,
            solvedAt,
          },
        })
      })
    )

    console.log(
      `[sync] Sync complete: ${allQuestions.length} synced, ${slugToSolvedAt.size} matched, ${imported} imported`
    )
    return NextResponse.json({
      synced: allQuestions.length,
      matched: slugToSolvedAt.size,
      imported,
    })
  } catch (error) {
    console.error("[sync] ERROR:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
