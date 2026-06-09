"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { generateRoadmapItems } from "@/lib/roadmap-generator"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createRoadmap(input: {
  name: string
  goalType: string
  companyId?: string
  topicSlug?: string
  startDate: string
  endDate: string
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: string
}): Promise<ActionResult<{ id: string; itemCount: number }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    if (!input.name.trim()) return { success: false, error: "Name is required" }
    if (new Date(input.endDate) <= new Date(input.startDate)) return { success: false, error: "End date must be after start date" }

    const roadmap = await prisma.roadmap.create({
      data: {
        userId: session.user.id,
        name: input.name.trim(),
        goalType: input.goalType,
        companyId: input.companyId || null,
        topicSlug: input.topicSlug || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        dailyQuestionTarget: input.dailyQuestionTarget,
        studyDays: input.studyDays,
        strategy: input.strategy,
      },
    })

    const items = await generateRoadmapItems({
      userId: session.user.id,
      goalType: input.goalType as "company" | "topic" | "mixed" | "custom",
      companyId: input.companyId,
      topicSlug: input.topicSlug,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      dailyQuestionTarget: input.dailyQuestionTarget,
      studyDays: input.studyDays,
      strategy: input.strategy as "balanced" | "frequency" | "weak_topic" | "sprint",
    })

    if (items.length > 0) {
      await prisma.roadmapItem.createMany({
        data: items.map((item) => ({
          roadmapId: roadmap.id,
          questionId: item.questionId,
          plannedDate: item.plannedDate,
          sortOrder: item.sortOrder,
          sourceReason: item.sourceReason,
        })),
      })
    }

    await prisma.roadmapEvent.create({
      data: {
        roadmapId: roadmap.id,
        type: "created",
        payload: { itemCount: items.length, strategy: input.strategy },
      },
    })

    return { success: true, data: { id: roadmap.id, itemCount: items.length } }
  } catch (e) {
    console.error("createRoadmap error:", e)
    return { success: false, error: "Failed to create roadmap" }
  }
}

export async function getRoadmaps(): Promise<ActionResult<{
  roadmaps: {
    id: string
    name: string
    status: string
    goalType: string
    companyName: string | null
    startDate: Date
    endDate: Date
    totalItems: number
    completedItems: number
    dailyQuestionTarget: number
  }[]
}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmaps = await prisma.roadmap.findMany({
      where: { userId: session.user.id, status: { not: "archived" } },
      include: {
        _count: { select: { items: true } },
        items: { where: { status: "completed" }, select: { id: true } },
        company: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return {
      success: true,
      data: {
        roadmaps: roadmaps.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          goalType: r.goalType,
          companyName: r.company?.name ?? null,
          startDate: r.startDate,
          endDate: r.endDate,
          totalItems: r._count.items,
          completedItems: r.items.length,
          dailyQuestionTarget: r.dailyQuestionTarget,
        })),
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch roadmaps" }
  }
}

export async function getRoadmapDetail(roadmapId: string): Promise<ActionResult<{
  id: string
  name: string
  status: string
  goalType: string
  companyName: string | null
  topicSlug: string | null
  startDate: Date
  endDate: Date
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: string
  items: {
    id: string
    plannedDate: Date
    sortOrder: number
    status: string
    sourceReason: string | null
    locked: boolean
    question: { id: string; title: string; leetcodeUrl: string; difficulty: string; topics: string[] }
  }[]
  events: { id: string; type: string; payload: unknown; createdAt: Date }[]
}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      include: {
        company: { select: { name: true } },
        items: {
          include: {
            question: {
              select: { id: true, title: true, leetcodeUrl: true, difficulty: true, topics: true },
            },
          },
          orderBy: [{ plannedDate: "asc" }, { sortOrder: "asc" }],
        },
        events: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })

    if (!roadmap) return { success: false, error: "Roadmap not found" }

    return {
      success: true,
      data: {
        id: roadmap.id,
        name: roadmap.name,
        status: roadmap.status,
        goalType: roadmap.goalType,
        companyName: roadmap.company?.name ?? null,
        topicSlug: roadmap.topicSlug,
        startDate: roadmap.startDate,
        endDate: roadmap.endDate,
        dailyQuestionTarget: roadmap.dailyQuestionTarget,
        studyDays: roadmap.studyDays,
        strategy: roadmap.strategy,
        items: roadmap.items.map((item) => ({
          id: item.id,
          plannedDate: item.plannedDate,
          sortOrder: item.sortOrder,
          status: item.status,
          sourceReason: item.sourceReason,
          locked: item.locked,
          question: item.question,
        })),
        events: roadmap.events.map((e) => ({
          id: e.id,
          type: e.type,
          payload: e.payload,
          createdAt: e.createdAt,
        })),
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch roadmap detail" }
  }
}

export async function completeRoadmapItem(itemId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const item = await prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { userId: session.user.id } },
    })
    if (!item) return { success: false, error: "Item not found" }

    await prisma.roadmapItem.update({
      where: { id: itemId },
      data: { status: "completed" },
    })

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId: item.questionId } },
      update: { solved: true, solvedAt: new Date() },
      create: { userId: session.user.id, questionId: item.questionId, solved: true, solvedAt: new Date() },
    })

    await prisma.roadmapEvent.create({
      data: { roadmapId: item.roadmapId, type: "item_completed", payload: { itemId, questionId: item.questionId } },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to complete item" }
  }
}

export async function moveRoadmapItem(itemId: string, newDate: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const item = await prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { userId: session.user.id } },
    })
    if (!item) return { success: false, error: "Item not found" }

    await prisma.roadmapItem.update({
      where: { id: itemId },
      data: { plannedDate: new Date(newDate), status: "moved" },
    })

    await prisma.roadmapEvent.create({
      data: { roadmapId: item.roadmapId, type: "item_moved", payload: { itemId, newDate } },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to move item" }
  }
}

export async function rebalanceRoadmap(roadmapId: string): Promise<ActionResult<{ moved: number }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      include: {
        items: {
          where: { status: { in: ["planned", "moved"] }, locked: false },
          orderBy: { plannedDate: "asc" },
        },
      },
    })
    if (!roadmap) return { success: false, error: "Roadmap not found" }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const overdueItems = roadmap.items.filter((item) => new Date(item.plannedDate) < now)
    if (overdueItems.length === 0) return { success: true, data: { moved: 0 } }

    const studyDaySet = new Set(roadmap.studyDays)
    const futureDates: Date[] = []
    const cursor = new Date(now)
    cursor.setDate(cursor.getDate() + 1)
    const endDate = new Date(roadmap.endDate)
    while (cursor <= endDate) {
      if (studyDaySet.has(cursor.getDay())) {
        futureDates.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    if (futureDates.length === 0) return { success: false, error: "No future study days available" }

    let moved = 0
    let dateIdx = 0
    for (const item of overdueItems) {
      if (dateIdx >= futureDates.length) break
      await prisma.roadmapItem.update({
        where: { id: item.id },
        data: { plannedDate: futureDates[dateIdx], status: "moved" },
      })
      moved++
      if (moved % roadmap.dailyQuestionTarget === 0) dateIdx++
    }

    await prisma.roadmapEvent.create({
      data: { roadmapId, type: "rebalanced", payload: { movedCount: moved } },
    })

    return { success: true, data: { moved } }
  } catch {
    return { success: false, error: "Failed to rebalance roadmap" }
  }
}

export async function updateRoadmapStatus(roadmapId: string, status: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    await prisma.roadmap.update({
      where: { id: roadmapId, userId: session.user.id },
      data: { status },
    })

    await prisma.roadmapEvent.create({
      data: { roadmapId, type: status === "paused" ? "paused" : status === "archived" ? "resumed" : status },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to update roadmap status" }
  }
}

export async function getCompaniesForSelect(): Promise<ActionResult<{ companies: { id: string; name: string; slug: string }[] }>> {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    })
    return { success: true, data: { companies } }
  } catch {
    return { success: false, error: "Failed to fetch companies" }
  }
}

export async function getTopicsForSelect(): Promise<ActionResult<{ topics: string[] }>> {
  try {
    const questions = await prisma.question.findMany({ select: { topics: true } })
    const topicSet = new Set<string>()
    for (const q of questions) {
      for (const t of q.topics) topicSet.add(t)
    }
    return { success: true, data: { topics: Array.from(topicSet).sort() } }
  } catch {
    return { success: false, error: "Failed to fetch topics" }
  }
}
