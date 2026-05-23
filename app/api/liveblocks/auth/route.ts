import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const roomId = body?.roomId as string | undefined

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
    }

    const secret = process.env.LIVEBLOCKS_SECRET_KEY
    if (!secret) {
      return NextResponse.json({ error: "Liveblocks not configured" }, { status: 500 })
    }

    // Call Liveblocks API to issue a token
    const response = await fetch("https://liveblocks.net/api/v1/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        roomId,
        userId: session.user.id,
        userInfo: {
          name: session.user.name || session.user.email || "Anonymous",
          avatar: session.user.image || "",
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Liveblocks auth error:", response.status, errText)
      return NextResponse.json({ error: "Failed to authorize" }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error("Liveblocks auth error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
