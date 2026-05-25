"use server";

import { getReadinessScores } from "@/actions/readiness";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStudyReport } from "@/lib/study-report";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getWeeklyStudyReport(): Promise<
  ActionResult<ReturnType<typeof generateStudyReport>>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 7);

    const [solvedThisWeek, dueReviews, completedReviews, interviewSessions, readinessResult] =
      await Promise.all([
        prisma.userQuestion.findMany({
          where: {
            userId,
            solved: true,
            solvedAt: { gte: periodStart, lte: periodEnd },
          },
          include: {
            question: {
              select: { id: true, title: true, difficulty: true, topics: true },
            },
          },
          orderBy: { solvedAt: "desc" },
        }),
        prisma.reviewItem.findMany({
          where: { userId, nextReviewAt: { lte: periodEnd } },
          take: 8,
          include: { question: { select: { title: true } } },
          orderBy: { nextReviewAt: "asc" },
        }),
        prisma.reviewItem.count({
          where: { userId, lastReviewedAt: { gte: periodStart, lte: periodEnd } },
        }),
        prisma.interviewSession.findMany({
          where: { userId, startedAt: { gte: periodStart, lte: periodEnd } },
          select: { rating: true, duration: true },
        }),
        getReadinessScores(),
      ]);

    return {
      success: true,
      data: generateStudyReport({
        periodStart,
        periodEnd,
        solvedThisWeek: solvedThisWeek.map((item) => item.question),
        dueReviews: dueReviews.map((item) => ({
          id: item.id,
          questionTitle: item.question.title,
          confidence: item.confidence,
        })),
        completedReviews,
        interviewSessions,
        readiness: readinessResult.success
          ? readinessResult.data.companies.map((company) => ({
              name: company.name,
              score: company.score,
            }))
          : [],
      }),
    };
  } catch {
    return { success: false, error: "Failed to generate study report" };
  }
}
