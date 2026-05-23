import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const questionId = searchParams.get("questionId")

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 })
    }

    const userQuestion = await prisma.userQuestion.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId,
        },
      },
      select: { code: true, language: true },
    })

    return NextResponse.json({
      code: userQuestion?.code || "",
      language: userQuestion?.language || "cpp",
    })
  } catch (err) {
    console.error("GET /api/question/code error:", err)
    return NextResponse.json(
      { error: "Failed to fetch question code" },
      { status: 500 }
    )
  }
}
