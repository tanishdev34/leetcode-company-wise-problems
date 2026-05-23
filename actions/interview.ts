"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function startInterview(
  questionId: string,
  durationMinutes: number = 45
): Promise<ActionResult<{ id: string; startedAt: Date }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const session_ = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        questionId,
        duration: durationMinutes * 60,
        status: "in_progress",
      },
    })

    return { success: true, data: { id: session_.id, startedAt: session_.startedAt } }
  } catch {
    return { success: false, error: "Failed to start interview" }
  }
}

export async function completeInterview(
  id: string,
  data: { rating?: number; notes?: string; reflection?: string }
): Promise<ActionResult<{ success: true }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    await prisma.interviewSession.update({
      where: { id, userId: session.user.id },
      data: {
        status: "completed",
        endedAt: new Date(),
        rating: data.rating,
        notes: data.notes,
        reflection: data.reflection,
      },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to complete interview" }
  }
}

export async function cancelInterview(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    await prisma.interviewSession.update({
      where: { id, userId: session.user.id },
      data: { status: "cancelled", endedAt: new Date() },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to cancel interview" }
  }
}

export async function getInterviewHistory(): Promise<
  ActionResult<{
    sessions: {
      id: string
      questionId: string
      questionTitle: string
      leetcodeUrl: string
      difficulty: string
      status: string
      startedAt: Date
      endedAt: Date | null
      duration: number | null
      rating: number | null
    }[]
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: session.user.id },
      include: {
        question: {
          select: { id: true, title: true, leetcodeUrl: true, difficulty: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    })

    return {
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          questionId: s.question.id,
          questionTitle: s.question.title,
          leetcodeUrl: s.question.leetcodeUrl,
          difficulty: s.question.difficulty,
          status: s.status,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          duration: s.duration,
          rating: s.rating,
        })),
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch interview history" }
  }
}

export async function getRandomQuestion(
  difficulty?: string
): Promise<ActionResult<{ id: string; title: string; leetcodeUrl: string; difficulty: string; topics: string[] }>> {
  try {
    const where: Record<string, unknown> = {}
    if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
      where.difficulty = difficulty
    }

    const count = await prisma.question.count({ where })
    if (count === 0) return { success: false, error: "No questions available" }

    const skip = Math.floor(Math.random() * count)
    const question = await prisma.question.findFirst({
      where,
      skip,
      select: { id: true, title: true, leetcodeUrl: true, difficulty: true, topics: true },
    })

    if (!question) return { success: false, error: "No question found" }

    return { success: true, data: question }
  } catch {
    return { success: false, error: "Failed to get random question" }
  }
}
