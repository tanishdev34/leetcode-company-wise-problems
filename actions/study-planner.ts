"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createStudyPlan(
  name: string,
  weekStart: string, // ISO date string for Monday
): Promise<ActionResult<{ id: string; name: string; weekStart: Date }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const plan = await prisma.studyPlan.create({
      data: {
        userId: session.user.id,
        name,
        weekStart: new Date(weekStart),
      },
    });

    return {
      success: true,
      data: { id: plan.id, name: plan.name, weekStart: plan.weekStart },
    };
  } catch {
    return { success: false, error: "Failed to create study plan" };
  }
}

export async function getStudyPlans(): Promise<
  ActionResult<{
    plans: {
      id: string;
      name: string;
      weekStart: Date;
      itemCount: number;
      completedCount: number;
      createdAt: Date;
    }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const plans = await prisma.studyPlan.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { items: true } },
        items: { where: { status: "completed" }, select: { id: true } },
      },
      orderBy: { weekStart: "desc" },
    });

    return {
      success: true,
      data: {
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          weekStart: p.weekStart,
          itemCount: p._count.items,
          completedCount: p.items.length,
          createdAt: p.createdAt,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch study plans" };
  }
}

export async function getStudyPlanDetail(
  planId: string,
): Promise<
  ActionResult<{
    id: string;
    name: string;
    weekStart: Date;
    items: {
      id: string;
      questionId: string;
      questionTitle: string;
      leetcodeUrl: string;
      difficulty: string;
      dayOfWeek: number;
      status: string;
      notes: string | null;
      sortOrder: number;
    }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId: session.user.id },
      include: {
        items: {
          include: {
            question: {
              select: { id: true, title: true, leetcodeUrl: true, difficulty: true },
            },
          },
          orderBy: [{ dayOfWeek: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!plan) return { success: false, error: "Study plan not found" };

    return {
      success: true,
      data: {
        id: plan.id,
        name: plan.name,
        weekStart: plan.weekStart,
        items: plan.items.map((item) => ({
          id: item.id,
          questionId: item.questionId,
          questionTitle: item.question.title,
          leetcodeUrl: item.question.leetcodeUrl,
          difficulty: item.question.difficulty,
          dayOfWeek: item.dayOfWeek,
          status: item.status,
          notes: item.notes,
          sortOrder: item.sortOrder,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch study plan detail" };
  }
}

export async function addPlanItem(
  planId: string,
  questionId: string,
  dayOfWeek: number,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    // Verify plan belongs to user
    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId: session.user.id },
    });
    if (!plan) return { success: false, error: "Study plan not found" };

    // Get max sortOrder for this day
    const maxItem = await prisma.studyPlanItem.findFirst({
      where: { planId, dayOfWeek },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const item = await prisma.studyPlanItem.create({
      data: {
        planId,
        questionId,
        dayOfWeek,
        sortOrder: (maxItem?.sortOrder ?? -1) + 1,
      },
    });

    return { success: true, data: { id: item.id } };
  } catch {
    return { success: false, error: "Failed to add plan item" };
  }
}

export async function updatePlanItemStatus(
  itemId: string,
  status: string,
): Promise<ActionResult<{ success: true }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: { status },
    });

    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to update item status" };
  }
}

export async function removePlanItem(
  itemId: string,
): Promise<ActionResult<{ success: true }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await prisma.studyPlanItem.delete({ where: { id: itemId } });

    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to remove plan item" };
  }
}

export async function deleteStudyPlan(
  planId: string,
): Promise<ActionResult<{ success: true }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await prisma.studyPlan.delete({
      where: { id: planId },
    });

    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to delete study plan" };
  }
}

export async function searchQuestionsForPlan(
  query: string,
): Promise<
  ActionResult<{
    questions: { id: string; title: string; difficulty: string; leetcodeUrl: string }[];
  }>
> {
  try {
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { topics: { has: query } },
        ],
      },
      select: { id: true, title: true, difficulty: true, leetcodeUrl: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: { questions } };
  } catch {
    return { success: false, error: "Failed to search questions" };
  }
}
