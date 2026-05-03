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
    recentActivity: {
      id: string; title: string; leetcodeUrl: string;
      difficulty: "EASY" | "MEDIUM" | "HARD"; solvedAt: Date | null;
    }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;

    const totalSolved = await prisma.userQuestion.count({
      where: { userId, solved: true },
    });

    const byDifficulty = await prisma.userQuestion.groupBy({
      by: ["questionId"], where: { userId, solved: true }, _count: true,
    });

    const questionIds = byDifficulty.map((uq) => uq.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }, select: { id: true, difficulty: true },
    });

    const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const q of questions) difficultyCounts[q.difficulty]++;

    const userQuestions = await prisma.userQuestion.findMany({
      where: { userId, solved: true },
      include: { question: { select: { companyId: true } } },
    });

    const companySolvedMap = new Map<string, number>();
    for (const uq of userQuestions) {
      companySolvedMap.set(uq.question.companyId, (companySolvedMap.get(uq.question.companyId) || 0) + 1);
    }

    const companies = await prisma.company.findMany({
      include: { _count: { select: { questions: { where: { timePeriod: "ALL" } } } } },
    });

    const byCompany = companies
      .map((c) => ({ name: c.name, slug: c.slug, solved: companySolvedMap.get(c.id) || 0, total: c._count.questions }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.solved - a.solved);

    const recentActivity = await prisma.userQuestion.findMany({
      where: { userId, solved: true }, orderBy: { solvedAt: "desc" }, take: 10,
      include: { question: { select: { id: true, title: true, leetcodeUrl: true, difficulty: true } } },
    });

    return {
      success: true,
      data: {
        totalSolved, byDifficulty: difficultyCounts, byCompany,
        recentActivity: recentActivity.map((uq) => ({
          id: uq.question.id, title: uq.question.title,
          leetcodeUrl: uq.question.leetcodeUrl, difficulty: uq.question.difficulty, solvedAt: uq.solvedAt,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}
