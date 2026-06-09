"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { after } from "next/server"
import { generateAiRoadmapPlan } from "@/lib/roadmap-ai-planner"
import type { RoadmapIntensity } from "@/lib/roadmap-ai-schemas"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
type RoadmapCreateInput = {
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
  intensity?: "relaxed" | "balanced" | "aggressive"
}

export async function createRoadmap(input: RoadmapCreateInput): Promise<ActionResult<{ id: string; itemCount: number; feasibility: string; summary: string }>> {
  const startedAt = Date.now()
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    if (!input.prompt.trim()) {
      return { success: false, error: "Describe what you want to prepare for" }
    }

    if (input.prompt.length > 1000) {
      return { success: false, error: "Roadmap prompt must be 1000 characters or less" }
    }

    const intensity: RoadmapIntensity = input.intensity ?? "balanced"
    const prompt = input.prompt.trim()
    const now = new Date()
    const fallbackEndDate = new Date(now)
    fallbackEndDate.setDate(fallbackEndDate.getDate() + 21)

    const roadmap = await prisma.roadmap.create({
      data: {
        userId: session.user.id,
        name: draftRoadmapName(prompt),
        goalType: "custom",
        companyId: input.companyId || null,
        topicSlug: input.topicSlug || null,
        startDate: now,
        endDate: input.deadline ? new Date(`${input.deadline}T00:00:00`) : fallbackEndDate,
        prompt,
        intensity,
        aiSummary: "Designing your roadmap from your goal, progress, and question history.",
        feasibility: "realistic",
        feasibilityNote: null,
        generationStatus: "running",
      },
    })
    logRoadmapTiming(roadmap.id, "draft:create", startedAt, {
      promptLength: prompt.length,
      intensity,
    })

    const eventStartedAt = Date.now()
    await prisma.roadmapEvent.create({
      data: {
        roadmapId: roadmap.id,
        type: "ai_generation_started",
        payload: {
          prompt,
          intensity,
          deadline: input.deadline ?? null,
        },
      },
    })
    logRoadmapTiming(roadmap.id, "event:ai_generation_started", eventStartedAt)

    after(async () => {
      await generateRoadmapInBackground({
        roadmapId: roadmap.id,
        userId: session.user.id,
        input: { ...input, prompt, intensity },
      })
    })
    logRoadmapTiming(roadmap.id, "scheduled", startedAt)

    return {
      success: true,
      data: {
        id: roadmap.id,
        itemCount: 0,
        feasibility: "realistic",
        summary: "Designing your roadmap in the background.",
      },
    }
  } catch (e) {
    console.error("createRoadmap error:", e)
    return { success: false, error: "Failed to create roadmap" }
  }
}

async function generateRoadmapInBackground(params: {
  roadmapId: string
  userId: string
  input: RoadmapCreateInput & { prompt: string; intensity: RoadmapIntensity }
}) {
  const startedAt = Date.now()
  logRoadmapEvent(params.roadmapId, "background:start", {
    intensity: params.input.intensity,
    hasCompany: Boolean(params.input.companyId),
    hasTopic: Boolean(params.input.topicSlug),
    hasDeadline: Boolean(params.input.deadline),
  })
  try {
    const plannerStartedAt = Date.now()
    const { plan, warnings } = await generateAiRoadmapPlan({
      userId: params.userId,
      prompt: params.input.prompt,
      companyId: params.input.companyId,
      topicSlug: params.input.topicSlug,
      deadline: params.input.deadline,
      intensity: params.input.intensity,
      traceId: params.roadmapId,
    })
    logRoadmapTiming(params.roadmapId, "planner:complete", plannerStartedAt, {
      days: plan.days.length,
      items: plan.days.reduce((sum, day) => sum + day.items.length, 0),
      warnings: warnings.length,
    })

    const itemCount = plan.days.reduce((sum, day) => sum + day.items.length, 0)

    const persistStartedAt = Date.now()
    await prisma.$transaction(async (tx) => {
      await tx.roadmapItem.deleteMany({
        where: { roadmapId: params.roadmapId },
      })

      await tx.roadmap.update({
        where: { id: params.roadmapId },
        data: {
          name: plan.name,
          goalType: plan.goalType,
          topicSlug: params.input.topicSlug || plan.inferredTopicSlug || null,
          startDate: new Date(`${plan.startDate}T12:00:00`),
          endDate: new Date(`${plan.endDate}T12:00:00`),
          intensity: plan.intensity,
          aiSummary: plan.summary,
          aiPlanJson: plan,
          feasibility: plan.feasibility.status,
          feasibilityNote: plan.feasibility.message,
          generationStatus: "done",
          generationError: null,
        },
      })

      if (itemCount > 0) {
        await tx.roadmapItem.createMany({
          data: plan.days.flatMap((day) =>
            day.items.map((item) => ({
              roadmapId: params.roadmapId,
              questionId: item.questionId,
              plannedDate: new Date(`${day.date}T12:00:00`),
              sortOrder: item.order,
              sourceReason: item.reason.slice(0, 180),
              aiReason: item.reason,
              itemType: item.itemType,
              dayTheme: day.theme,
            }))
          ),
        })
      }

      await tx.roadmapEvent.create({
        data: {
          roadmapId: params.roadmapId,
          type: "ai_generated",
          payload: {
            itemCount,
            feasibility: plan.feasibility,
            warnings,
          },
        },
      })
    })
    logRoadmapTiming(params.roadmapId, "persist:complete", persistStartedAt, {
      itemCount,
    })
    logRoadmapTiming(params.roadmapId, "background:complete", startedAt, {
      itemCount,
    })
  } catch (e) {
    console.error(`[roadmap:${params.roadmapId}] background:error`, e)
    const errorPersistStartedAt = Date.now()
    await prisma.roadmap.update({
      where: { id: params.roadmapId },
      data: {
        generationStatus: "error",
        generationError: e instanceof Error ? e.message : "Failed to generate roadmap",
        aiSummary: "Roadmap generation failed before assignments were created.",
      },
    })
    await prisma.roadmapEvent.create({
      data: {
        roadmapId: params.roadmapId,
        type: "generation_failed",
        payload: {
          error: e instanceof Error ? e.message : String(e),
        },
      },
    })
    logRoadmapTiming(params.roadmapId, "error:persist", errorPersistStartedAt)
    logRoadmapTiming(params.roadmapId, "background:failed", startedAt)
  }
}

function logRoadmapTiming(
  roadmapId: string,
  step: string,
  startedAt: number,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${roadmapId}] ${step} ${Date.now() - startedAt}ms`, meta)
}

function logRoadmapEvent(
  roadmapId: string,
  step: string,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${roadmapId}] ${step}`, meta)
}

function draftRoadmapName(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim()
  if (!cleaned) return "Designing your roadmap"
  return cleaned.length > 54 ? `${cleaned.slice(0, 51)}...` : cleaned
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
    intensity: string
    feasibility: string
    generationStatus: string
    generationError: string | null
    aiSummary: string | null
    prompt: string | null
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
          intensity: r.intensity,
          feasibility: r.feasibility,
          generationStatus: r.generationStatus,
          generationError: r.generationError,
          aiSummary: r.aiSummary,
          prompt: r.prompt,
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
  prompt: string | null
  intensity: string
  aiSummary: string | null
  feasibility: string
  feasibilityNote: string | null
  generationStatus: string
  generationError: string | null
  items: {
    id: string
    plannedDate: Date
    sortOrder: number
    status: string
    sourceReason: string | null
    locked: boolean
    itemType: string
    aiReason: string | null
    dayTheme: string | null
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
        prompt: roadmap.prompt,
        intensity: roadmap.intensity,
        aiSummary: roadmap.aiSummary,
        feasibility: roadmap.feasibility,
        feasibilityNote: roadmap.feasibilityNote,
        generationStatus: roadmap.generationStatus,
        generationError: roadmap.generationError,
        items: roadmap.items.map((item) => ({
          id: item.id,
          plannedDate: item.plannedDate,
          sortOrder: item.sortOrder,
          status: item.status,
          sourceReason: item.sourceReason,
          locked: item.locked,
          itemType: item.itemType,
          aiReason: item.aiReason,
          dayTheme: item.dayTheme,
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

export async function deleteRoadmap(roadmapId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
    })
    if (!roadmap) return { success: false, error: "Roadmap not found" }

    await prisma.roadmap.delete({ where: { id: roadmapId } })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to delete roadmap" }
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
