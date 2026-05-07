import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { processAnalysisJob } from "@/lib/analyze"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can generate analyses" },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const questionId = typeof body?.questionId === "string" ? body.questionId : null
    const code = typeof body?.code === "string" ? body.code : ""
    const language = typeof body?.language === "string" ? body.language : "cpp"

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 })
    }
    if (!code.trim()) {
      return NextResponse.json({ error: "No code to analyze" }, { status: 400 })
    }

    const existingActive = await prisma.analysisJob.findFirst({
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

    const job = await prisma.analysisJob.create({
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
        await processAnalysisJob(job.id)
      } catch (err) {
        console.error("after(processAnalysisJob) crashed:", err)
      }
    })

    return NextResponse.json({ jobId: job.id, status: "pending" })
  } catch (err) {
    console.error("POST /api/analyze error:", err)
    return NextResponse.json(
      { error: "Failed to enqueue analysis" },
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

    const questionId = req.nextUrl.searchParams.get("questionId")
    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 })
    }

    const job = await prisma.analysisJob.findFirst({
      where: { userId: session.user.id, questionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        error: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ job })
  } catch (err) {
    console.error("GET /api/analyze error:", err)
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    )
  }
}
