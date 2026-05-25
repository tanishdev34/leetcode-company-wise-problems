"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMistakeMemory } from "@/lib/mistake-memory";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getMistakeMemory(): Promise<
  ActionResult<ReturnType<typeof buildMistakeMemory>>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;
    const [solutionReviews, reviewItems, interviewSessions] = await Promise.all([
      prisma.solutionReview.findMany({
        where: { userId, status: "done" },
        take: 30,
        orderBy: { updatedAt: "desc" },
        include: { question: { select: { title: true } } },
      }),
      prisma.reviewItem.findMany({
        where: { userId },
        take: 40,
        orderBy: [{ confidence: "asc" }, { reviewCount: "desc" }],
        include: { question: { select: { title: true } } },
      }),
      prisma.interviewSession.findMany({
        where: { userId, status: "completed" },
        take: 20,
        orderBy: { endedAt: "desc" },
        include: { question: { select: { title: true } } },
      }),
    ]);

    return {
      success: true,
      data: buildMistakeMemory({
        solutionReviews: solutionReviews.map((review) => ({
          questionTitle: review.question.title,
          correctness: review.correctness,
          suggestions: review.suggestions,
          edgeCases: review.edgeCases,
          createdAt: review.createdAt,
        })),
        reviewItems: reviewItems.map((item) => ({
          questionTitle: item.question.title,
          confidence: item.confidence,
          reviewCount: item.reviewCount,
          nextReviewAt: item.nextReviewAt,
        })),
        interviewSessions: interviewSessions.map((session) => ({
          questionTitle: session.question.title,
          rating: session.rating,
          reflection: session.reflection,
        })),
      }),
    };
  } catch {
    return { success: false, error: "Failed to build mistake memory" };
  }
}
