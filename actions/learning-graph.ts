"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildLearningGraph } from "@/lib/learning-graph";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getLearningGraph(): Promise<
  ActionResult<ReturnType<typeof buildLearningGraph>>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;
    const now = new Date();

    const [questions, solvedQuestions, dueReviews] = await Promise.all([
      prisma.question.findMany({
        take: 120,
        orderBy: [{ userQuestions: { _count: "desc" } }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          difficulty: true,
          topics: true,
          companyQuestions: {
            where: { timePeriod: "ALL" },
            take: 4,
            orderBy: { frequency: "desc" },
            select: {
              company: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.userQuestion.findMany({
        where: { userId, solved: true },
        select: { questionId: true },
      }),
      prisma.reviewItem.findMany({
        where: { userId, nextReviewAt: { lte: now } },
        select: { questionId: true },
      }),
    ]);

    return {
      success: true,
      data: buildLearningGraph({
        questions: questions.map((question) => ({
          id: question.id,
          title: question.title,
          difficulty: question.difficulty,
          topics: question.topics,
          companies: question.companyQuestions.map((item) => item.company),
        })),
        solvedQuestionIds: solvedQuestions.map((question) => question.questionId),
        dueReviewQuestionIds: dueReviews.map((review) => review.questionId),
      }),
    };
  } catch {
    return { success: false, error: "Failed to build learning graph" };
  }
}
