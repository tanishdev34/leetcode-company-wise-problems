import { prisma } from "./db"
import { Difficulty } from "../generated/prisma/client"

interface RoadmapInput {
  userId: string
  goalType: "company" | "topic" | "mixed" | "custom"
  companyId?: string
  topicSlug?: string
  startDate: Date
  endDate: Date
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: "balanced" | "frequency" | "weak_topic" | "sprint"
}

interface GeneratedItem {
  questionId: string
  plannedDate: Date
  sortOrder: number
  sourceReason: string
}

const DIFF_ORDER: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 }

export async function generateRoadmapItems(input: RoadmapInput): Promise<GeneratedItem[]> {
  const { userId, goalType, companyId, topicSlug, startDate, endDate, dailyQuestionTarget, studyDays, strategy } = input

  const solvedQuestions = await prisma.userQuestion.findMany({
    where: { userId, solved: true },
    select: { questionId: true },
  })
  const solvedIds = new Set(solvedQuestions.map((q) => q.questionId))

  let candidates: { id: string; difficulty: string; topics: string[]; frequency: number }[] = []

  if (goalType === "company" && companyId) {
    const cqs = await prisma.companyQuestion.findMany({
      where: { companyId, timePeriod: "ALL" },
      include: { question: { select: { id: true, difficulty: true, topics: true } } },
      orderBy: { frequency: "desc" },
    })
    candidates = cqs
      .filter((cq) => !solvedIds.has(cq.questionId))
      .map((cq) => ({
        id: cq.questionId,
        difficulty: cq.question.difficulty,
        topics: cq.question.topics,
        frequency: cq.frequency,
      }))
  } else if (goalType === "topic" && topicSlug) {
    const questions = await prisma.question.findMany({
      where: { topics: { has: topicSlug }, id: { notIn: Array.from(solvedIds) } },
      select: { id: true, difficulty: true, topics: true },
    })
    candidates = questions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      topics: q.topics,
      frequency: 50,
    }))
  }

  if (candidates.length === 0) return []

  // Sort by strategy
  if (strategy === "frequency") {
    candidates.sort((a, b) => b.frequency - a.frequency)
  } else if (strategy === "weak_topic") {
    const topicSolvedCounts = new Map<string, number>()
    for (const q of candidates) {
      for (const t of q.topics) {
        topicSolvedCounts.set(t, (topicSolvedCounts.get(t) || 0) + (solvedIds.has(q.id) ? 1 : 0))
      }
    }
    candidates.sort((a, b) => {
      const aScore = a.topics.reduce((sum, t) => sum + (topicSolvedCounts.get(t) || 0), 0)
      const bScore = b.topics.reduce((sum, t) => sum + (topicSolvedCounts.get(t) || 0), 0)
      return aScore - bScore
    })
  } else if (strategy === "sprint") {
    candidates.sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 2) - (DIFF_ORDER[b.difficulty] ?? 2))
  } else {
    // balanced: mix difficulties evenly
    const easy = candidates.filter((c) => c.difficulty === "EASY")
    const medium = candidates.filter((c) => c.difficulty === "MEDIUM")
    const hard = candidates.filter((c) => c.difficulty === "HARD")
    candidates = []
    let ei = 0, mi = 0, hi = 0
    while (ei < easy.length || mi < medium.length || hi < hard.length) {
      if (mi < medium.length) candidates.push(medium[mi++])
      if (ei < easy.length) candidates.push(easy[ei++])
      if (hi < hard.length) candidates.push(hard[hi++])
    }
  }

  // Generate study days
  const studyDaySet = new Set(studyDays)
  const studyDates: Date[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  while (current <= end) {
    if (studyDaySet.has(current.getDay())) {
      studyDates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  if (studyDates.length === 0) return []

  // Distribute questions across days with difficulty balancing
  const items: GeneratedItem[] = []
  let candidateIdx = 0
  for (const date of studyDates) {
    const dayItems: { id: string; reason: string }[] = []
    for (let i = 0; i < dailyQuestionTarget && candidateIdx < candidates.length; i++) {
      const c = candidates[candidateIdx]
      let reason = "company-frequency"
      if (strategy === "weak_topic") reason = "weak-topic"
      else if (strategy === "sprint") reason = "difficulty-balance"
      else if (strategy === "balanced") reason = "difficulty-balanced"
      dayItems.push({ id: c.id, reason })
      candidateIdx++
    }
    for (let i = 0; i < dayItems.length; i++) {
      items.push({
        questionId: dayItems[i].id,
        plannedDate: date,
        sortOrder: i,
        sourceReason: dayItems[i].reason,
      })
    }
  }

  return items
}
