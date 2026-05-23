import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { processSolutionReview } from "@/lib/solution-review"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const questionId =
      typeof body?.questionId === "string" ? body.questionId : null
    const code = typeof body?.code === "string" ? body.code : ""
    const language =
      typeof body?.language === "string" ? body.language : "cpp"

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 })
    }
    if (!code.trim()) {
      return NextResponse.json({ error: "No code to review" }, { status: 400 })
    }

    const existingActive = await prisma.solutionReview.findFirst({
      where: {
        userId: session.user.id,
        questionId,
        status: { in: ["pending", "running"] },
      },
      orderBy: { createdAt: "desc" },
    })
    if (existingActive) {
      return NextResponse.json({
        jobId: existingActive.id,
        status: existingActive.status,
        alreadyRunning: true,
      })
    }

    const job = await prisma.solutionReview.create({
      data: {
        userId: session.user.id,
        questionId,
        code,
        language,
        status: "pending",
      },
    })

    after(async () => {
      try {
        await processSolutionReview(job.id)
      } catch (err) {
        console.error("after(processSolutionReview) crashed:", err)
      }
    })

    return NextResponse.json({ jobId: job.id, status: "pending" })
  } catch (err) {
    console.error("POST /api/solution-review error:", err)
    return NextResponse.json(
      { error: "Failed to enqueue solution review" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const jobId = req.nextUrl.searchParams.get("jobId")
    const questionId = req.nextUrl.searchParams.get("questionId")

    if (jobId) {
      const job = await prisma.solutionReview.findFirst({
        where: { id: jobId, userId: session.user.id },
      })
      return NextResponse.json({ job })
    }

    if (questionId) {
      const job = await prisma.solutionReview.findFirst({
        where: { userId: session.user.id, questionId },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ job })
    }

    return NextResponse.json({ error: "Missing jobId or questionId" }, { status: 400 })
  } catch (err) {
    console.error("GET /api/solution-review error:", err)
    return NextResponse.json(
      { error: "Failed to fetch solution review" },
      { status: 500 }
    )
  }
}
