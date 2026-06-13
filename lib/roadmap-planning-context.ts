import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"

export interface RoadmapQuestionCandidate {
  id: string
  title: string
  difficulty: "EASY" | "MEDIUM" | "HARD"
  topics: string[]
  companyNames: string[]
  maxFrequency: number
  solved: boolean
  dueReview: boolean
  reviewConfidence: number | null
}

export interface RoadmapPlanningContext {
  today: string
  candidates: RoadmapQuestionCandidate[]
  solvedCount: number
  dueReviewCount: number
  availableCompanies: { id: string; name: string; slug: string }[]
  availableTopics: string[]
}

export async function buildRoadmapPlanningContext(input: {
  userId: string
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
  traceId?: string
}): Promise<RoadmapPlanningContext> {
  const traceId = input.traceId ?? "unknown"
  const startedAt = Date.now()
  const now = new Date()
  const queryStartedAt = Date.now()
  const [progressCounts, candidateRows] = await Promise.all([
    prisma.$queryRaw<{ solved_count: bigint; due_review_count: bigint }[]>`
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE uq.solved = true), 0)::bigint AS solved_count,
        COALESCE((
          SELECT COUNT(*)
          FROM review_item ri
          WHERE ri."userId" = ${input.userId}
            AND ri."nextReviewAt" <= ${now}
        ), 0)::bigint AS due_review_count
      FROM "UserQuestion" uq
      WHERE uq."userId" = ${input.userId}
    `,
    prisma.$queryRaw<RoadmapCandidateRow[]>`
      SELECT
        q.id,
        q.title,
        q.difficulty::text AS difficulty,
        q.topics,
        COALESCE(MAX(cq.frequency), 0)::float8 AS "maxFrequency",
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), NULL),
          ARRAY[]::text[]
        ) AS "companyNames",
        COALESCE(MAX(CASE WHEN uq.solved = true THEN 1 ELSE 0 END), 0)::int AS solved,
        COALESCE(MAX(CASE WHEN ri."nextReviewAt" <= ${now} THEN 1 ELSE 0 END), 0)::int AS "dueReview",
        MAX(ri.confidence)::int AS "reviewConfidence"
      FROM "Question" q
      LEFT JOIN "CompanyQuestion" cq
        ON cq."questionId" = q.id
       AND cq."timePeriod" = 'ALL'
      LEFT JOIN "Company" c
        ON c.id = cq."companyId"
      LEFT JOIN "UserQuestion" uq
        ON uq."questionId" = q.id
       AND uq."userId" = ${input.userId}
      LEFT JOIN review_item ri
        ON ri."questionId" = q.id
       AND ri."userId" = ${input.userId}
      WHERE ${buildCandidateSql(input)}
      GROUP BY q.id, q.title, q.difficulty, q.topics
      ORDER BY
        COALESCE(MAX(CASE WHEN uq.solved = true THEN 1 ELSE 0 END), 0) ASC,
        COALESCE(MAX(CASE WHEN ri."nextReviewAt" <= ${now} THEN 1 ELSE 0 END), 0) DESC,
        COALESCE(MAX(cq.frequency), 0) DESC,
        q.title ASC
      LIMIT 500
    `,
  ])
  logRoadmapTiming(traceId, "context:queries", queryStartedAt, {
    candidates: candidateRows.length,
  })

  const mapStartedAt = Date.now()
  const topicSet = new Set<string>()

  const candidates: RoadmapQuestionCandidate[] = candidateRows.map((row) => {
    for (const topic of row.topics) topicSet.add(topic)
    return {
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
      topics: row.topics,
      companyNames: row.companyNames,
      maxFrequency: row.maxFrequency,
      solved: row.solved === 1,
      dueReview: row.dueReview === 1,
      reviewConfidence: row.reviewConfidence,
    }
  })
  logRoadmapTiming(traceId, "context:map", mapStartedAt, {
    candidates: candidates.length,
    topics: topicSet.size,
  })

  const context = {
    today: toDateKey(now),
    candidates,
    solvedCount: Number(progressCounts[0]?.solved_count ?? 0),
    dueReviewCount: Number(progressCounts[0]?.due_review_count ?? 0),
    availableCompanies: [],
    availableTopics: Array.from(topicSet).sort(),
  }
  logRoadmapTiming(traceId, "context:complete", startedAt, {
    candidates: context.candidates.length,
    topics: context.availableTopics.length,
    solvedCount: context.solvedCount,
    dueReviewCount: context.dueReviewCount,
  })
  return context
}

type RoadmapCandidateRow = {
  id: string
  title: string
  difficulty: "EASY" | "MEDIUM" | "HARD"
  topics: string[]
  maxFrequency: number
  companyNames: string[]
  solved: number
  dueReview: number
  reviewConfidence: number | null
}

function buildCandidateSql(input: {
  companyId?: string
  topicSlug?: string
}) {
  if (input.companyId) {
    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "CompanyQuestion" scoped_cq
      WHERE scoped_cq."questionId" = q.id
        AND scoped_cq."companyId" = ${input.companyId}
        AND scoped_cq."timePeriod" = 'ALL'
    )`
  }

  if (input.topicSlug) {
    return Prisma.sql`q.topics @> ARRAY[${input.topicSlug}]::text[]`
  }

  return Prisma.sql`true`
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

function logRoadmapTiming(
  traceId: string,
  step: string,
  startedAt: number,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${traceId}] ${step} ${Date.now() - startedAt}ms`, meta)
}
