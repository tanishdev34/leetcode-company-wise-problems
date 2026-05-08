"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getDashboardStats(): Promise<
  ActionResult<{
    totalSolved: number;
    byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
    byCompany: { name: string; slug: string; solved: number; total: number }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;

    const solvedUserQuestions = await prisma.userQuestion.findMany({
      where: { userId, solved: true },
      select: { questionId: true, solvedAt: true },
    });

    const totalSolved = solvedUserQuestions.length;
    const solvedIds = new Set(solvedUserQuestions.map((uq) => uq.questionId));

    const solvedQuestions = await prisma.question.findMany({
      where: { id: { in: Array.from(solvedIds) } },
      select: { id: true, difficulty: true },
    });

    const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const q of solvedQuestions) difficultyCounts[q.difficulty]++;

    const companies = await prisma.company.findMany({
      include: {
        companyQuestions: {
          where: { timePeriod: "ALL" },
          select: { questionId: true },
        },
        _count: { select: { companyQuestions: { where: { timePeriod: "ALL" } } } },
      },
    });

    const byCompany = companies
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        total: c._count.companyQuestions,
        solved: c.companyQuestions.filter((cq) => solvedIds.has(cq.questionId)).length,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.solved - a.solved);

    return {
      success: true,
      data: {
        totalSolved,
        byDifficulty: difficultyCounts,
        byCompany,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}
