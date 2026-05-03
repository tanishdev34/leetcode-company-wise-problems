"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TimePeriod } from "../generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getCompanies(): Promise<
  ActionResult<{
    companies: { id: string; name: string; slug: string; questionCount: number }[];
    totalQuestions: number;
    totalCompanies: number;
  }>
> {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    });
    const totalQuestions = await prisma.question.count();
    return {
      success: true,
      data: {
        companies: companies.map((c) => ({
          id: c.id, name: c.name, slug: c.slug, questionCount: c._count.questions,
        })),
        totalQuestions,
        totalCompanies: companies.length,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch companies" };
  }
}

export async function getCompanyQuestions(
  slug: string,
  timePeriod: TimePeriod = "ALL" as TimePeriod,
  page: number = 1,
  pageSize: number = 50
): Promise<
  ActionResult<{
    questions: {
      id: string; title: string; leetcodeUrl: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      topics: string[]; frequency: number; acceptanceRate: number; solved: boolean;
    }[];
    totalPages: number; currentPage: number;
  }>
> {
  try {
    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      return { success: true, data: { questions: [], totalPages: 0, currentPage: 1 } };
    }

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id || null;
    } catch {}

    const where = { companyId: company.id, timePeriod };
    const totalQuestions = await prisma.question.count({ where });
    const totalPages = Math.ceil(totalQuestions / pageSize);

    if (userId) {
      const questions = await prisma.question.findMany({
        where,
        orderBy: [{ frequency: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { userQuestions: { where: { userId }, select: { solved: true, solvedAt: true } } },
      });

      return {
        success: true,
        data: {
          questions: questions.map((q) => ({
            id: q.id, title: q.title, leetcodeUrl: q.leetcodeUrl,
            difficulty: q.difficulty, topics: q.topics,
            frequency: q.frequency, acceptanceRate: q.acceptanceRate,
            solved: q.userQuestions?.[0]?.solved || false,
          })),
          totalPages, currentPage: page,
        },
      };
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: [{ frequency: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        questions: questions.map((q) => ({
          id: q.id, title: q.title, leetcodeUrl: q.leetcodeUrl,
          difficulty: q.difficulty, topics: q.topics,
          frequency: q.frequency, acceptanceRate: q.acceptanceRate,
          solved: false,
        })),
        totalPages, currentPage: page,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch questions" };
  }
}

export async function getQuestionDetail(
  questionId: string
): Promise<
  ActionResult<{
    id: string;
    title: string;
    leetcodeUrl: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    topics: string[];
    frequency: number;
    acceptanceRate: number;
    companies: { name: string; slug: string }[];
    solved: boolean;
    solvedAt: Date | null;
    notes: string;
    code: string;
  }>
> {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        company: { select: { name: true, slug: true } },
      },
    });

    if (!question) return { success: false, error: "Question not found" };

    // Find all companies that have this question (same leetcodeUrl)
    const allVersions = await prisma.question.findMany({
      where: { leetcodeUrl: question.leetcodeUrl, timePeriod: "ALL" },
      include: { company: { select: { name: true, slug: true } } },
    });
    const companies = allVersions
      .map((v) => v.company)
      .filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i);

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id || null;
    } catch {}

    let solved = false;
    let solvedAt: Date | null = null;
    let notes = "";
    let code = "";

    if (userId) {
      const uq = await prisma.userQuestion.findUnique({
        where: { userId_questionId: { userId, questionId } },
        select: { solved: true, solvedAt: true, notes: true, code: true },
      });
      if (uq) {
        solved = uq.solved;
        solvedAt = uq.solvedAt;
        notes = uq.notes || "";
        code = uq.code || "";
      }
    }

    return {
      success: true,
      data: {
        id: question.id,
        title: question.title,
        leetcodeUrl: question.leetcodeUrl,
        difficulty: question.difficulty,
        topics: question.topics,
        frequency: question.frequency,
        acceptanceRate: question.acceptanceRate,
        companies,
        solved,
        solvedAt,
        notes,
        code,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch question detail" };
  }
}

export async function toggleSolved(
  questionId: string
): Promise<ActionResult<{ solved: boolean; solvedAt: Date | null }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userId = session.user.id;
    const existing = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    if (existing) {
      const updated = await prisma.userQuestion.update({
        where: { id: existing.id },
        data: { solved: !existing.solved, solvedAt: !existing.solved ? new Date() : null },
      });
      return { success: true, data: { solved: updated.solved, solvedAt: updated.solvedAt } };
    }

    const created = await prisma.userQuestion.create({
      data: { userId, questionId, solved: true, solvedAt: new Date() },
    });
    return { success: true, data: { solved: created.solved, solvedAt: created.solvedAt } };
  } catch {
    return { success: false, error: "Failed to toggle solved status" };
  }
}

export async function saveNotes(
  questionId: string, markdown: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };
    if (markdown.length > 10000) return { success: false, error: "Notes exceed 10,000 characters" };

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { notes: markdown },
      create: { userId: session.user.id, questionId, notes: markdown },
    });
    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to save notes" };
  }
}

export async function saveCode(
  questionId: string, code: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };
    if (code.length > 50000) return { success: false, error: "Code exceeds 50,000 characters" };

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { code },
      create: { userId: session.user.id, questionId, code },
    });
    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to save code" };
  }
}

export async function getNotes(
  questionId: string
): Promise<ActionResult<{ notes: string; code: string }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const userQuestion = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      select: { notes: true, code: true },
    });
    return { success: true, data: { notes: userQuestion?.notes || "", code: userQuestion?.code || "" } };
  } catch {
    return { success: false, error: "Failed to fetch notes" };
  }
}
