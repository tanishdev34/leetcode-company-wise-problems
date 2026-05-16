import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import type { Difficulty, TimePeriod } from "@/generated/prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { titleSlug, title, difficulty, topics, acceptanceRate, code, language } = body as {
      titleSlug: string
      title: string
      difficulty: string
      topics: string[]
      acceptanceRate: number
      code?: string
      language?: string
    }

    if (!titleSlug || !title || !difficulty) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: titleSlug, title, difficulty" },
        { status: 422 }
      )
    }

    const diff = difficulty.toUpperCase()
    if (!["EASY", "MEDIUM", "HARD"].includes(diff)) {
      return NextResponse.json(
        { success: false, error: `Invalid difficulty: ${difficulty}` },
        { status: 422 }
      )
    }

    // 1. Ensure "Extension" company exists
    const company = await prisma.company.upsert({
      where: { slug: "extension" },
      update: { name: "Extension" },
      create: { name: "Extension", slug: "extension" },
    })

    // 2. Upsert the question
    const leetcodeUrl = `https://leetcode.com/problems/${titleSlug}/`
    const question = await prisma.question.upsert({
      where: { leetcodeUrl },
      update: {
        title,
        difficulty: diff as Difficulty,
        topics,
        acceptanceRate,
      },
      create: {
        title,
        leetcodeUrl,
        difficulty: diff as Difficulty,
        topics,
        acceptanceRate,
      },
    })

    // 3. Link question to "Extension" company
    await prisma.companyQuestion.upsert({
      where: {
        questionId_companyId_timePeriod: {
          questionId: question.id,
          companyId: company.id,
          timePeriod: "ALL" as TimePeriod,
        },
      },
      update: { frequency: 0 },
      create: {
        questionId: question.id,
        companyId: company.id,
        timePeriod: "ALL" as TimePeriod,
        frequency: 0,
      },
    })

    // 4. If code provided, save it as solved
    if (code) {
      await prisma.userQuestion.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: question.id,
          },
        },
        update: {
          code,
          language: language || "cpp",
          solved: true,
          solvedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          questionId: question.id,
          code,
          language: language || "cpp",
          solved: true,
          solvedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { questionId: question.id },
    })
  } catch (err) {
    console.error("Extension add-solution error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to add solution" },
      { status: 500 }
    )
  }
}
