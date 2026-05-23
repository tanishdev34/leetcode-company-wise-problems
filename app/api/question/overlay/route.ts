import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Missing slug query parameter" },
        { status: 400 }
      )
    }

    // Build the leetcodeUrl pattern to match
    const leetcodeUrl = `https://leetcode.com/problems/${slug}/`

    // Find the question by leetcodeUrl
    const question = await prisma.question.findFirst({
      where: { leetcodeUrl: { contains: slug } },
      include: {
        companyQuestions: {
          include: { company: true },
        },
      },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      )
    }

    // Build companies array
    const companies = question.companyQuestions.map((cq) => ({
      name: cq.company.name,
      frequency: cq.frequency,
    }))

    // Try to get the session (optional — user may not be logged in)
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null)

    // Default response fields (public)
    const data: {
      title: string
      difficulty: string
      solved: boolean
      solvedAt: string | null
      companies: { name: string; frequency: number }[]
      reviewDue: boolean
      reviewCount: number
      notes: string | null
      questionId: string
    } = {
      title: question.title,
      difficulty: question.difficulty,
      solved: false,
      solvedAt: null,
      companies,
      reviewDue: false,
      reviewCount: 0,
      notes: null,
      questionId: question.id,
    }

    if (session?.user) {
      // Fetch user-specific data
      const [userQuestion, reviewItem] = await Promise.all([
        prisma.userQuestion.findUnique({
          where: {
            userId_questionId: {
              userId: session.user.id,
              questionId: question.id,
            },
          },
          select: { solved: true, solvedAt: true, notes: true },
        }),
        prisma.reviewItem.findUnique({
          where: {
            userId_questionId: {
              userId: session.user.id,
              questionId: question.id,
            },
          },
          select: { reviewCount: true, nextReviewAt: true },
        }),
      ])

      if (userQuestion) {
        data.solved = userQuestion.solved
        data.solvedAt = userQuestion.solvedAt?.toISOString() ?? null
        data.notes = userQuestion.notes
      }

      if (reviewItem) {
        data.reviewCount = reviewItem.reviewCount
        data.reviewDue = reviewItem.nextReviewAt <= new Date()
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("Question overlay error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to fetch question overlay data" },
      { status: 500 }
    )
  }
}
