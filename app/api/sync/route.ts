import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { normalizeLeetcodeUrl } from "@/lib/utils"
import { Difficulty } from "@/generated/prisma/client"
import { autoScheduleAfterSolve } from "@/actions/review"
import {
  fetchRecentAcSubmissions,
  fetchQuestionDetails as fetchQuestionDetailsGQL,
} from "@/lib/leetcode-graphql"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { username } = await req.json()
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 })
    }

    const userId = session.user.id

    // Create SyncRun record
    const syncRun = await prisma.syncRun.create({
      data: { userId, provider: "leetcode", status: "running" },
    })

    try {
      // Fetch recent accepted submissions via LeetCode GraphQL
      const submissions = await fetchRecentAcSubmissions(username, 100)

      const slugToSolvedAt = new Map<string, Date>()
      for (const s of submissions) {
        const solvedAt = new Date(parseInt(s.timestamp) * 1000)
        const existing = slugToSolvedAt.get(s.titleSlug)
        if (!existing || solvedAt > existing) {
          slugToSolvedAt.set(s.titleSlug, solvedAt)
        }
      }

      if (slugToSolvedAt.size === 0) {
        await prisma.syncRun.update({
          where: { id: syncRun.id },
          data: { status: "done", finishedAt: new Date(), matchedCount: 0, importedCount: 0 },
        })
        return NextResponse.json({ synced: 0, matched: 0, imported: 0, skipped: 0, runId: syncRun.id })
      }

      // Find existing questions by titleSlug or leetcodeUrl
      const slugs = Array.from(slugToSolvedAt.keys())
      const existingQuestions = await prisma.question.findMany({
        where: {
          OR: [
            { titleSlug: { in: slugs } },
            { leetcodeUrl: { in: slugs.map((s) => normalizeLeetcodeUrl(`https://leetcode.com/problems/${s}`)) } },
          ],
        },
        select: { id: true, titleSlug: true, leetcodeUrl: true },
      })

      const slugToQuestion = new Map<string, { id: string; leetcodeUrl: string }>()
      for (const q of existingQuestions) {
        if (q.titleSlug) slugToQuestion.set(q.titleSlug, { id: q.id, leetcodeUrl: q.leetcodeUrl })
        // Also map from URL slug
        const urlSlug = q.leetcodeUrl.match(/problems\/([^/]+)/)?.[1]
        if (urlSlug && !slugToQuestion.has(urlSlug)) {
          slugToQuestion.set(urlSlug, { id: q.id, leetcodeUrl: q.leetcodeUrl })
        }
      }

    // Hydrate missing questions via GraphQL and link to Extension company
    const missingSlugs = slugs.filter((s) => !slugToQuestion.has(s))
    let imported = 0
    let skipped = 0

    // Get or create Extension company
    const extensionCompany = await prisma.company.upsert({
      where: { slug: "extension" },
      update: {},
      create: { name: "Extension", slug: "extension" },
      select: { id: true },
    })

      for (const slug of missingSlugs) {
        try {
          const details = await fetchQuestionDetailsGQL(slug)
          if (!details || details.isPaidOnly) {
            skipped++
            continue
          }

          const diff = details.difficulty.toUpperCase()
          if (!["EASY", "MEDIUM", "HARD"].includes(diff)) {
            skipped++
            continue
          }

          const leetcodeUrl = normalizeLeetcodeUrl(`https://leetcode.com/problems/${slug}`)
          const q = await prisma.question.upsert({
            where: { leetcodeUrl },
            update: { titleSlug: slug },
            create: {
              title: details.title,
              titleSlug: slug,
              leetcodeUrl,
              difficulty: diff as Difficulty,
              topics: details.topicTags.map((t) => t.name).filter(Boolean),
              acceptanceRate: details.acRate / 100,
            },
            select: { id: true, leetcodeUrl: true },
          })
          slugToQuestion.set(slug, { id: q.id, leetcodeUrl: q.leetcodeUrl })
          imported++

          // Link to Extension company if not already linked to any company
          const existingCq = await prisma.companyQuestion.findFirst({
            where: { questionId: q.id },
            select: { id: true },
          })
          if (!existingCq) {
            await prisma.companyQuestion.create({
              data: {
                questionId: q.id,
                companyId: extensionCompany.id,
                timePeriod: "ALL",
                frequency: 0,
              },
            })
          }
        } catch (err) {
          console.error(`[sync] Failed to hydrate ${slug}:`, err)
          skipped++
        }
      }

      // Upsert UserQuestion and schedule reviews
      const allQuestions = slugs
        .map((slug) => slugToQuestion.get(slug))
        .filter((q): q is { id: string; leetcodeUrl: string } => Boolean(q))

      let matched = 0
      for (const q of allQuestions) {
        const slug = slugs.find((s) => {
          const question = slugToQuestion.get(s)
          return question?.id === q.id
        })
        const solvedAt = (slug && slugToSolvedAt.get(slug)) ?? new Date()

        await prisma.userQuestion.upsert({
          where: { userId_questionId: { userId, questionId: q.id } },
          update: { solved: true, solvedAt },
          create: { userId, questionId: q.id, solved: true, solvedAt },
        })
        matched++
      }

      // Auto-schedule reviews for newly solved questions
      const existingReviewIds = new Set(
        (await prisma.reviewItem.findMany({
          where: { userId, questionId: { in: allQuestions.map((q) => q.id) } },
          select: { questionId: true },
        })).map((r) => r.questionId)
      )

      for (const q of allQuestions) {
        if (!existingReviewIds.has(q.id)) {
          await autoScheduleAfterSolve(q.id)
        }
      }

      // Update SyncRun
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "done",
          finishedAt: new Date(),
          matchedCount: matched,
          importedCount: imported,
          skippedCount: skipped,
        },
      })

      // Log event for active roadmaps
      const activeRoadmaps = await prisma.roadmap.findMany({
        where: { userId, status: "active" },
        select: { id: true },
      })
      for (const roadmap of activeRoadmaps) {
        await prisma.roadmapEvent.create({
          data: {
            roadmapId: roadmap.id,
            type: "sync_matched",
            payload: { matched, imported, skipped },
          },
        })
      }

      const warning = submissions.length >= 100
        ? "Recent sync complete. LeetCode limits recent submissions to ~100; older solves may need the extension."
        : undefined

      return NextResponse.json({
        synced: matched,
        matched: slugToSolvedAt.size,
        imported,
        skipped,
        runId: syncRun.id,
        warning,
      })
    } catch (error) {
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: { status: "error", finishedAt: new Date(), error: String(error) },
      })
      throw error
    }
  } catch (error) {
    console.error("[sync] ERROR:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
