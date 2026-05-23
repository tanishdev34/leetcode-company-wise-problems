"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CompanyReadiness {
  name: string;
  slug: string;
  score: number;
  solvedCount: number;
  totalCount: number;
  difficultyCoverage: number; // 0-3 (unique difficulties solved)
  totalDifficulties: number; // 3 (EASY, MEDIUM, HARD)
  recencyScore: number; // 0-100
  reviewFreshness: number; // 0-100
  breakdown: {
    solvedRatio: number; // 0-40
    difficultyBonus: number; // 0-20
    recencyBonus: number; // 0-20
    reviewBonus: number; // 0-20
  };
}

export async function getReadinessScores(): Promise<
  ActionResult<{
    companies: CompanyReadiness[];
    overallScore: number;
    totalSolved: number;
    totalQuestions: number;
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;
    const now = new Date();

    // Get all solved user questions
    const solvedQuestions = await prisma.userQuestion.findMany({
      where: { userId, solved: true },
      select: { questionId: true, solvedAt: true },
    });
    const solvedIds = new Set(solvedQuestions.map((uq) => uq.questionId));

    // Get solvedAt map
    const solvedAtMap = new Map<string, Date>();
    for (const uq of solvedQuestions) {
      if (uq.solvedAt) solvedAtMap.set(uq.questionId, uq.solvedAt);
    }

    if (solvedIds.size === 0) {
      return {
        success: true,
        data: {
          companies: [],
          overallScore: 0,
          totalSolved: 0,
          totalQuestions: 0,
        },
      };
    }

    // Get all companies with their question counts
    const companies = await prisma.company.findMany({
      include: {
        companyQuestions: {
          where: { timePeriod: "ALL" },
          select: { questionId: true },
        },
        _count: { select: { companyQuestions: { where: { timePeriod: "ALL" } } } },
      },
    });

    // Get difficulty for solved questions
    const solvedQuestionDetails = await prisma.question.findMany({
      where: { id: { in: Array.from(solvedIds) } },
      select: { id: true, difficulty: true },
    });
    const questionDifficulty = new Map(solvedQuestionDetails.map((q) => [q.id, q.difficulty]));

    // Get review items
    const reviewItems = await prisma.reviewItem.findMany({
      where: { userId },
      select: { questionId: true, nextReviewAt: true, confidence: true },
    });
    const reviewMap = new Map(reviewItems.map((r) => [r.questionId, r]));

    const companyScores: CompanyReadiness[] = [];

    for (const company of companies) {
      const total = company._count.companyQuestions;
      if (total === 0) continue;

      const companyQuestionIds = company.companyQuestions.map((cq) => cq.questionId);
      const solvedInCompany = companyQuestionIds.filter((id) => solvedIds.has(id));
      const solvedCount = solvedInCompany.length;

      if (solvedCount === 0) continue;

      // 1. Solved ratio (0-40 points)
      const solvedRatio = solvedCount / total;
      const solvedRatioScore = Math.round(solvedRatio * 40);

      // 2. Difficulty coverage (0-20 points)
      const difficulties = new Set(
        solvedInCompany
          .map((id) => questionDifficulty.get(id))
          .filter(Boolean),
      );
      const difficultyCoverage = difficulties.size;
      const difficultyBonus = Math.round((difficultyCoverage / 3) * 20);

      // 3. Recency (0-20 points)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentSolves = solvedInCompany.filter(
        (id) => solvedAtMap.get(id) && solvedAtMap.get(id)! >= thirtyDaysAgo,
      ).length;
      const recencyScore = solvedCount > 0 ? Math.round((recentSolves / solvedCount) * 100) : 0;
      const recencyBonus = Math.round((recencyScore / 100) * 20);

      // 4. Review freshness (0-20 points)
      const reviewedInCompany = solvedInCompany.filter((id) => reviewMap.has(id)).length;
      const freshReviews = solvedInCompany.filter((id) => {
        const review = reviewMap.get(id);
        return review && review.nextReviewAt > now;
      }).length;
      const reviewFreshness = reviewedInCompany > 0
        ? Math.round((freshReviews / reviewedInCompany) * 100)
        : 0;
      const reviewBonus = Math.round((reviewFreshness / 100) * 20);

      const totalScore = solvedRatioScore + difficultyBonus + recencyBonus + reviewBonus;

      companyScores.push({
        name: company.name,
        slug: company.slug,
        score: totalScore,
        solvedCount,
        totalCount: total,
        difficultyCoverage,
        totalDifficulties: 3,
        recencyScore,
        reviewFreshness,
        breakdown: {
          solvedRatio: solvedRatioScore,
          difficultyBonus,
          recencyBonus,
          reviewBonus,
        },
      });
    }

    // Sort by score descending
    companyScores.sort((a, b) => b.score - a.score);

    const totalSolved = solvedIds.size;
    const totalQuestions = await prisma.question.count();
    const overallScore = totalSolved > 0
      ? Math.round(
          companyScores.reduce((sum, c) => sum + c.score * c.solvedCount, 0) /
            companyScores.reduce((sum, c) => sum + c.solvedCount, 0),
        )
      : 0;

    return {
      success: true,
      data: {
        companies: companyScores.slice(0, 20), // Top 20 companies
        overallScore,
        totalSolved,
        totalQuestions,
      },
    };
  } catch {
    return { success: false, error: "Failed to compute readiness scores" };
  }
}
