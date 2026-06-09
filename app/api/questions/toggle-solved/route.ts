import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { autoScheduleAfterSolve } from "@/actions/review"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { questionId } = body as { questionId: string }

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId" },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const existing = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })

    if (existing) {
      const becomingSolved = !existing.solved
      const updated = await prisma.userQuestion.update({
        where: { id: existing.id },
        data: {
          solved: becomingSolved,
          solvedAt: becomingSolved ? new Date() : null,
        },
      })
      if (becomingSolved) {
        await autoScheduleAfterSolve(questionId)
      }
      return NextResponse.json({
        success: true,
        data: { solved: updated.solved, solvedAt: updated.solvedAt },
      })
    }

    const created = await prisma.userQuestion.create({
      data: { userId, questionId, solved: true, solvedAt: new Date() },
    })
    await autoScheduleAfterSolve(questionId)
    return NextResponse.json({
      success: true,
      data: { solved: created.solved, solvedAt: created.solvedAt },
    })
  } catch (err) {
    console.error("Toggle solved error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to toggle solved status" },
      { status: 500 }
    )
  }
}
