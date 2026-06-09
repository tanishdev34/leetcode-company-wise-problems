"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { TimePeriod } from "../generated/prisma/client"
import { autoScheduleAfterSolve } from "./review"
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getCompanies(): Promise<
  ActionResult<{
    companies: {
      id: string
      name: string
      slug: string
      questionCount: number
    }[]
    totalQuestions: number
    totalCompanies: number
  }>
> {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { companyQuestions: { where: { timePeriod: "ALL" } } },
        },
      },
      orderBy: { name: "asc" },
    })
    const totalQuestions = await prisma.question.count()
    return {
      success: true,
      data: {
        companies: companies.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          questionCount: c._count.companyQuestions,
        })),
        totalQuestions,
        totalCompanies: companies.length,
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch companies" }
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
      id: string
      title: string
      leetcodeUrl: string
      difficulty: "EASY" | "MEDIUM" | "HARD"
      topics: string[]
      frequency: number
      acceptanceRate: number
      solved: boolean
    }[]
    totalPages: number
    currentPage: number
  }>
> {
  try {
    const company = await prisma.company.findUnique({ where: { slug } })
    if (!company) {
      return {
        success: true,
        data: { questions: [], totalPages: 0, currentPage: 1 },
      }
    }

    let userId: string | null = null
    try {
      const session = await auth.api.getSession({ headers: await headers() })
      userId = session?.user?.id || null
    } catch {}

    const where = { companyId: company.id, timePeriod }

    // Fetch all question IDs and frequencies for this company (lightweight)
    const allCqs = await prisma.companyQuestion.findMany({
      where,
      select: { questionId: true, frequency: true },
    })

    const totalQuestions = allCqs.length
    const totalPages = Math.ceil(totalQuestions / pageSize)

    // Fetch user's solved questions with timestamps
    let solvedMap = new Map<string, Date | null>()
    if (userId) {
      const questionIds = allCqs.map((cq) => cq.questionId)
      const userQuestions = await prisma.userQuestion.findMany({
        where: { userId, questionId: { in: questionIds }, solved: true },
        select: { questionId: true, solvedAt: true },
      })
      for (const uq of userQuestions) {
        solvedMap.set(uq.questionId, uq.solvedAt)
      }
    }

    // Sort: solved first (by solvedAt desc), then unsolved (by frequency desc)
    const sorted = [...allCqs].sort((a, b) => {
      const aSolved = solvedMap.has(a.questionId)
      const bSolved = solvedMap.has(b.questionId)

      if (aSolved !== bSolved) {
        return aSolved ? -1 : 1 // solved first
      }

      if (aSolved) {
        // Both solved: most recently solved first
        const aTime = solvedMap.get(a.questionId)?.getTime() ?? 0
        const bTime = solvedMap.get(b.questionId)?.getTime() ?? 0
        return bTime - aTime
      }

      // Both unsolved: highest frequency first
      return b.frequency - a.frequency
    })

    // Paginate the sorted list
    const paginatedIds = sorted
      .slice((page - 1) * pageSize, page * pageSize)
      .map((cq) => cq.questionId)

    // Fetch full question details for the current page
    const cqs = await prisma.companyQuestion.findMany({
      where: { questionId: { in: paginatedIds }, companyId: company.id, timePeriod },
      include: { question: true },
    })

    // Restore the sorted order
    const idOrder = new Map(paginatedIds.map((id, idx) => [id, idx]))
    cqs.sort((a, b) => (idOrder.get(a.questionId) ?? 0) - (idOrder.get(b.questionId) ?? 0))

    return {
      success: true,
      data: {
        questions: cqs.map((cq) => ({
          id: cq.question.id,
          title: cq.question.title,
          leetcodeUrl: cq.question.leetcodeUrl,
          difficulty: cq.question.difficulty,
          topics: cq.question.topics,
          frequency: cq.frequency,
          acceptanceRate: cq.question.acceptanceRate,
          solved: solvedMap.has(cq.questionId),
        })),
        totalPages,
        currentPage: page,
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch questions" }
  }
}

export async function getQuestionDetail(questionId: string): Promise<
  ActionResult<{
    id: string
    title: string
    leetcodeUrl: string
    difficulty: "EASY" | "MEDIUM" | "HARD"
    topics: string[]
    frequency: number
    acceptanceRate: number
    companies: { name: string; slug: string }[]
    solved: boolean
    solvedAt: Date | null
    notes: string
    code: string
    language: string
    hints: string
  }>
> {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        companyQuestions: {
          include: { company: { select: { name: true, slug: true } } },
          orderBy: { frequency: "desc" },
        },
      },
    })

    if (!question) return { success: false, error: "Question not found" }

    const seen = new Set<string>()
    const companies = question.companyQuestions
      .map((cq) => cq.company)
      .filter((c) => (seen.has(c.slug) ? false : seen.add(c.slug) && true))

    const frequency = question.companyQuestions.reduce(
      (max, cq) => Math.max(max, cq.frequency),
      0
    )

    let userId: string | null = null
    try {
      const session = await auth.api.getSession({ headers: await headers() })
      userId = session?.user?.id || null
    } catch {}

    let solved = false
    let solvedAt: Date | null = null
    let notes = ""
    let code = ""
    let language = "cpp"
    let hints = ""

    if (userId) {
      const uq = await prisma.userQuestion.findUnique({
        where: { userId_questionId: { userId, questionId } },
        select: {
          solved: true,
          solvedAt: true,
          notes: true,
          code: true,
          language: true,
          hints: true,
        },
      })
      if (uq) {
        solved = uq.solved
        solvedAt = uq.solvedAt
        notes = uq.notes || ""
        code = uq.code || ""
        language = uq.language || "cpp"
        hints = uq.hints || ""
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
        frequency,
        acceptanceRate: question.acceptanceRate,
        companies,
        solved,
        solvedAt,
        notes,
        code,
        language,
        hints,
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch question detail" }
  }
}

export async function toggleSolved(
  questionId: string
): Promise<ActionResult<{ solved: boolean; solvedAt: Date | null }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const userId = session.user.id
    const existing = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })

    if (existing) {
      const becomingSolved = !existing.solved
      const updated = await prisma.userQuestion.update({
        where: { id: existing.id },
        data: {
          solved: becomingSolved,
          solvedAt: becomingSolved ? new Date() : null,
        },
      })
      // Auto-schedule review when becoming solved
      if (becomingSolved) {
        await autoScheduleAfterSolve(questionId)
      }
      return {
        success: true,
        data: { solved: updated.solved, solvedAt: updated.solvedAt },
      }
    }

    const created = await prisma.userQuestion.create({
      data: { userId, questionId, solved: true, solvedAt: new Date() },
    })
    // Auto-schedule initial review
    await autoScheduleAfterSolve(questionId)
    return {
      success: true,
      data: { solved: created.solved, solvedAt: created.solvedAt },
    }
  } catch {
    return { success: false, error: "Failed to toggle solved status" }
  }
}

export async function saveNotes(
  questionId: string,
  markdown: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }
    if (markdown.length > 10000)
      return { success: false, error: "Notes exceed 10,000 characters" }

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { notes: markdown },
      create: { userId: session.user.id, questionId, notes: markdown },
    })
    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to save notes" }
  }
}

export async function saveCode(
  questionId: string,
  code: string,
  language: string = "cpp"
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }
    if (code.length > 50000)
      return { success: false, error: "Code exceeds 50,000 characters" }

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { code, language },
      create: { userId: session.user.id, questionId, code, language },
    })
    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to save code" }
  }
}

export async function getNotes(
  questionId: string
): Promise<
  ActionResult<{ notes: string; code: string; language: string; hints: string }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const userQuestion = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      select: { notes: true, code: true, language: true, hints: true },
    })
    return {
      success: true,
      data: {
        notes: userQuestion?.notes || "",
        code: userQuestion?.code || "",
        language: userQuestion?.language || "cpp",
        hints: userQuestion?.hints || "",
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch notes" }
  }
}

export async function enqueueSolutionReview(
  questionId: string
): Promise<ActionResult<{ jobId: string; status: string; remaining: number }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const { allowed, remaining } = await checkAiRateLimit(
      session.user.id,
      session.user.role ?? "user"
    )
    if (!allowed) {
      return { success: false, error: "Daily AI limit reached. Try again tomorrow." }
    }

    // Get the user's code for this question
    const uq = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      select: { code: true, language: true },
    })

    if (!uq?.code?.trim()) {
      return { success: false, error: "No saved code to review. Save your code first." }
    }

    // Check for existing active review
    const existingActive = await prisma.solutionReview.findFirst({
      where: {
        userId: session.user.id,
        questionId,
        status: { in: ["pending", "running"] },
      },
      orderBy: { createdAt: "desc" },
    })
    if (existingActive) {
      return {
        success: true,
        data: { jobId: existingActive.id, status: existingActive.status, remaining },
      }
    }

    const job = await prisma.solutionReview.create({
      data: {
        userId: session.user.id,
        questionId,
        code: uq.code,
        language: uq.language || "cpp",
        status: "pending",
      },
    })

    await recordAiUsage(session.user.id, "solution_review")

    // Fire and forget the processing
    const { processSolutionReview } = await import("@/lib/solution-review")
    processSolutionReview(job.id).catch((err) =>
      console.error("processSolutionReview failed:", err)
    )

    return { success: true, data: { jobId: job.id, status: "pending", remaining: remaining - 1 } }
  } catch {
    return { success: false, error: "Failed to enqueue solution review" }
  }
}

export async function saveHints(
  questionId: string,
  hints: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }
    if (hints.length > 10000)
      return { success: false, error: "Hints exceed 10,000 characters" }

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { hints },
      create: { userId: session.user.id, questionId, hints },
    })
    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to save hints" }
  }
}

