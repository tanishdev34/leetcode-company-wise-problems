import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

// Generate a short, human-readable room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I, O, 0, 1 to avoid confusion
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST /api/interview/room — Create a new multiplayer room
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { questionId, durationMinutes = 45 } = body

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 })
    }

    // Generate a unique room code
    let roomCode: string
    let attempts = 0
    do {
      roomCode = generateRoomCode()
      const existing = await prisma.interviewSession.findFirst({ where: { roomCode } })
      if (!existing) break
      attempts++
    } while (attempts < 5)

    if (attempts >= 5) {
      return NextResponse.json({ error: "Failed to generate unique room code" }, { status: 500 })
    }

    const roomId = `interview-${roomCode}`

    const interview = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        questionId,
        duration: durationMinutes * 60,
        type: "multiplayer",
        roomCode,
        status: "in_progress",
        notes: session.user.id, // Store creator's userId in notes for tracking
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: interview.id,
        roomCode,
        roomId,
        questionId,
        duration: durationMinutes * 60,
      },
    })
  } catch (err) {
    console.error("Failed to create room:", err)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

// GET /api/interview/room?code=XXXXXX — Join a room by code
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const code = req.nextUrl.searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "Missing room code" }, { status: 400 })
    }

    const interview = await prisma.interviewSession.findFirst({
      where: { roomCode: code },
      include: {
        question: {
          select: { id: true, title: true, leetcodeUrl: true, difficulty: true, topics: true },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (interview.status !== "in_progress") {
      return NextResponse.json({ error: "This interview has already ended" }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: interview.id,
        roomCode: interview.roomCode,
        roomId: `interview-${interview.roomCode}`,
        question: interview.question,
        duration: interview.duration,
        startedAt: interview.startedAt,
      },
    })
  } catch (err) {
    console.error("Failed to join room:", err)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}
