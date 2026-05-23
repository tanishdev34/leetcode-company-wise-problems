"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Intervals in days for each confidence level
const INTERVALS: Record<number, number> = {
  1: 1,    // forgot → review tomorrow
  2: 2,    // struggled → review in 2 days
  3: 4,    // moderate → review in 4 days
  4: 7,    // good → review in 7 days
  5: 14,   // mastered → review in 14 days
};

/**
 * Schedule a review for a question after solving it.
 * Creates or updates the review item.
 */
export async function scheduleReview(
  questionId: string,
  confidence: number,
): Promise<ActionResult<{ nextReviewAt: Date }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const interval = INTERVALS[confidence] ?? 4;
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    const existing = await prisma.reviewItem.findUnique({
      where: {
        userId_questionId: { userId: session.user.id, questionId },
      },
    });

    if (existing) {
      const updated = await prisma.reviewItem.update({
        where: { id: existing.id },
        data: {
          confidence,
          reviewCount: { increment: 1 },
          lastReviewedAt: new Date(),
          nextReviewAt,
        },
      });
      return { success: true, data: { nextReviewAt: updated.nextReviewAt } };
    }

    const created = await prisma.reviewItem.create({
      data: {
        userId: session.user.id,
        questionId,
        confidence,
        reviewCount: 1,
        lastReviewedAt: new Date(),
        nextReviewAt,
      },
    });
    return { success: true, data: { nextReviewAt: created.nextReviewAt } };
  } catch {
    return { success: false, error: "Failed to schedule review" };
  }
}

/**
 * Get all review items that are due for review (nextReviewAt <= now),
 * ordered by nextReviewAt ascending.
 */
export async function getDueReviews(): Promise<
  ActionResult<{
    items: {
      id: string;
      questionId: string;
      questionTitle: string;
      leetcodeUrl: string;
      difficulty: string;
      confidence: number;
      reviewCount: number;
      lastReviewedAt: Date | null;
      nextReviewAt: Date;
    }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const now = new Date();
    const items = await prisma.reviewItem.findMany({
      where: {
        userId: session.user.id,
        nextReviewAt: { lte: now },
      },
      include: {
        question: {
          select: { id: true, title: true, leetcodeUrl: true, difficulty: true },
        },
      },
      orderBy: { nextReviewAt: "asc" },
    });

    return {
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          questionId: item.question.id,
          questionTitle: item.question.title,
          leetcodeUrl: item.question.leetcodeUrl,
          difficulty: item.question.difficulty,
          confidence: item.confidence,
          reviewCount: item.reviewCount,
          lastReviewedAt: item.lastReviewedAt,
          nextReviewAt: item.nextReviewAt,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch due reviews" };
  }
}

/**
 * Get upcoming review count (total items pending review).
 */
export async function getReviewStats(): Promise<
  ActionResult<{
    dueCount: number;
    totalCount: number;
    nextReview: string | null;
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const now = new Date();
    const userId = session.user.id;

    const [dueCount, totalCount, nextItem] = await Promise.all([
      prisma.reviewItem.count({
        where: { userId, nextReviewAt: { lte: now } },
      }),
      prisma.reviewItem.count({
        where: { userId },
      }),
      prisma.reviewItem.findFirst({
        where: { userId, nextReviewAt: { gt: now } },
        orderBy: { nextReviewAt: "asc" },
        select: { nextReviewAt: true },
      }),
    ]);

    return {
      success: true,
      data: {
        dueCount,
        totalCount,
        nextReview: nextItem?.nextReviewAt?.toISOString() ?? null,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch review stats" };
  }
}

/**
 * Automatically schedule a review when a question is toggled solved.
 * This is called from the toggleSolved action.
 */
export async function autoScheduleAfterSolve(
  questionId: string,
): Promise<ActionResult<{ nextReviewAt: Date }>> {
  return scheduleReview(questionId, 3); // Default: moderate confidence
}
