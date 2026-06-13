import { generateText, Output } from "ai"
import { z } from "zod"
import { getAiModel } from "@/lib/ai"
import {
  type AiRoadmapDay,
  type AiRoadmapItem,
  type AiRoadmapPlan,
  type RoadmapIntensity,
} from "@/lib/roadmap-ai-schemas"
import {
  buildRoadmapPlanningContext,
  type RoadmapPlanningContext,
  type RoadmapQuestionCandidate,
} from "@/lib/roadmap-planning-context"
import { validateAiRoadmapPlan } from "@/lib/roadmap-plan-validator"

const ITEMS_PER_DAY: Record<RoadmapIntensity, number> = {
  relaxed: 1,
  balanced: 2,
  aggressive: 3,
}

const MAX_ITEMS_PER_ROADMAP: Record<RoadmapIntensity, number> = {
  relaxed: 120,
  balanced: 220,
  aggressive: 320,
}

const AI_SELECTION_TIMEOUT_MS = 60000
const AI_SELECTION_CANDIDATE_LIMIT = 360

const aiRoadmapSelectionSchema = z.object({
  strategy: z.string().min(20).max(500),
  selectedQuestionIds: z
    .array(z.string().min(1))
    .min(1)
    .max(AI_SELECTION_CANDIDATE_LIMIT),
})

type AiRoadmapSelection = z.infer<typeof aiRoadmapSelectionSchema>

const ROADMAP_SELECTION_SYSTEM_PROMPT = `You choose LeetCode questions for a roadmap.

Return only structured output.
Your job is not to create a calendar. Local code handles dates and pacing.

Rules:
- Use only provided question IDs.
- Select the actual questions the user should study, in study order.
- Return at most the requested desiredQuestionCount.
- Prefer unsolved questions unless a solved question is due for review.
- Keep due-review questions limited; most selected questions should be unsolved practice.
- Start with foundations, then common company/topic patterns, then harder interview synthesis.
- Avoid leaving easy warm-up questions for the final stretch unless they are intentional reviews or fill a missing foundation.
- Respect the user's prompt, intensity, deadline pressure, difficulty, topics, frequency, solved status, and due review flags.
- Include a concise strategy explaining the question choices and ordering.`

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
}

export async function generateAiRoadmapPlan(input: {
  userId: string
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
  intensity: RoadmapIntensity
  traceId?: string
}): Promise<{
  plan: AiRoadmapPlan
  warnings: string[]
}> {
  const traceId = input.traceId ?? "unknown"
  const startedAt = Date.now()
  logRoadmapTiming(traceId, "planner:start", startedAt, {
    intensity: input.intensity,
    engine: "deterministic",
  })

  const contextStartedAt = Date.now()
  const context = await buildRoadmapPlanningContext(input)
  logRoadmapTiming(traceId, "planner:context", contextStartedAt, {
    candidates: context.candidates.length,
    solvedCount: context.solvedCount,
    dueReviewCount: context.dueReviewCount,
  })

  const planStartedAt = Date.now()
  const { plan, aiRanked } = await buildHybridRoadmapPlan(
    input,
    context,
    traceId
  )
  logRoadmapTiming(traceId, "planner:hybrid-plan", planStartedAt, {
    days: plan.days.length,
    items: countRoadmapItems(plan),
    aiRanked,
  })

  const validationStartedAt = Date.now()
  const validation = validateAiRoadmapPlan(plan, {
    intensity: input.intensity,
    candidateById: new Map(
      context.candidates.map((c) => [c.id, { solved: c.solved }])
    ),
  })
  logRoadmapTiming(traceId, "planner:validate", validationStartedAt, {
    valid: validation.valid,
    warnings: validation.valid ? validation.warnings.length : 0,
  })

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  logRoadmapTiming(traceId, "planner:complete", startedAt, {
    engine: "hybrid",
    days: validation.plan.days.length,
    items: countRoadmapItems(validation.plan),
  })
  return { plan: validation.plan, warnings: validation.warnings }
}

async function buildHybridRoadmapPlan(
  input: {
    prompt: string
    deadline?: string
    intensity: RoadmapIntensity
  },
  context: RoadmapPlanningContext,
  traceId: string
): Promise<{ plan: AiRoadmapPlan; aiRanked: boolean }> {
  const today = parseDateKey(context.today)
  const endDate = resolveEndDate(input, today)
  const studyDates = buildStudyDates(today, endDate, input.intensity)
  const itemsPerDay = ITEMS_PER_DAY[input.intensity]
  const capacity = Math.min(
    studyDates.length * itemsPerDay,
    MAX_ITEMS_PER_ROADMAP[input.intensity]
  )
  const aiSelection = await selectCandidatesWithAi(
    input,
    context,
    capacity,
    traceId
  )
  const selectedItems = selectRoadmapItems(
    context.candidates,
    capacity,
    aiSelection?.selectedQuestionIds
  )

  if (selectedItems.length === 0) {
    throw new Error("No usable questions found for this roadmap")
  }

  const days: AiRoadmapDay[] = []
  let itemIndex = 0
  for (const date of studyDates) {
    if (itemIndex >= selectedItems.length) break

    const dayItems = selectedItems.slice(itemIndex, itemIndex + itemsPerDay)
    itemIndex += dayItems.length

    days.push({
      date: toDateKey(date),
      theme: buildDayTheme(dayItems),
      items: dayItems.map(
        (candidate, order): AiRoadmapItem => ({
          questionId: candidate.id,
          itemType: candidate.solved ? "review" : "new_question",
          reason: buildReason(candidate),
          order,
        })
      ),
    })
  }

  return {
    aiRanked: Boolean(aiSelection),
    plan: {
      name: buildPlanName(input.prompt),
      summary: buildPlanSummary(
        input,
        context,
        days,
        countRoadmapItems({ days } as AiRoadmapPlan),
        aiSelection
      ),
      goalType: inferGoalType(input.prompt),
      inferredCompanySlug: null,
      inferredTopicSlug: null,
      startDate: days[0]?.date ?? context.today,
      endDate: days[days.length - 1]?.date ?? toDateKey(endDate),
      intensity: input.intensity,
      feasibility: buildFeasibility(
        input.intensity,
        selectedItems.length,
        capacity,
        context.candidates.length
      ),
      days,
    },
  }
}

async function selectCandidatesWithAi(
  input: {
    prompt: string
    deadline?: string
    intensity: RoadmapIntensity
  },
  context: RoadmapPlanningContext,
  capacity: number,
  traceId: string
): Promise<AiRoadmapSelection | null> {
  const startedAt = Date.now()
  const candidatePayload = buildSelectionCandidates(context.candidates, capacity)

  if (candidatePayload.length === 0) return null

  try {
    const result = await generateText({
      model: getAiModel(),
      output: Output.object({
        schema: aiRoadmapSelectionSchema,
        name: "roadmap_question_selection",
        description:
          "A compact selected set of existing question IDs for a roadmap.",
      }),
      system: ROADMAP_SELECTION_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        userRequest: input.prompt,
        today: context.today,
        deadline: input.deadline ?? null,
        intensity: input.intensity,
        desiredQuestionCount: capacity,
        candidates: candidatePayload,
      }),
      timeout: AI_SELECTION_TIMEOUT_MS,
    })

    const allowedIds = new Set(
      candidatePayload.map((candidate) => candidate.id)
    )
    const selectedQuestionIds = dedupe(
      result.output.selectedQuestionIds
    ).filter((id) => allowedIds.has(id))
    if (selectedQuestionIds.length === 0) return null

    logRoadmapTiming(traceId, "planner:ai-select", startedAt, {
      candidates: candidatePayload.length,
      selected: selectedQuestionIds.length,
      timedOut: false,
    })

    return {
      strategy: result.output.strategy,
      selectedQuestionIds,
    }
  } catch (error) {
    logRoadmapTiming(traceId, "planner:ai-select-fallback", startedAt, {
      candidates: candidatePayload.length,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function buildSelectionCandidates(
  candidates: RoadmapQuestionCandidate[],
  capacity: number
) {
  const unsolved = candidates.filter((candidate) => !candidate.solved)
  const dueReviews = candidates.filter(
    (candidate) => candidate.solved && candidate.dueReview
  )
  const candidateLimit = Math.min(
    AI_SELECTION_CANDIDATE_LIMIT,
    Math.max(capacity * 4, 160),
    candidates.length
  )

  return unsolved
    .slice(0, candidateLimit)
    .concat(dueReviews.slice(0, Math.min(30, Math.floor(candidateLimit * 0.15))))
    .slice(0, candidateLimit)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      difficulty: candidate.difficulty,
      topics: candidate.topics.slice(0, 4),
      companies: candidate.companyNames.slice(0, 3),
      frequency: candidate.maxFrequency,
      solved: candidate.solved,
      dueReview: candidate.dueReview,
      reviewConfidence: candidate.reviewConfidence,
    }))
}

function selectRoadmapItems(
  candidates: RoadmapQuestionCandidate[],
  capacity: number,
  aiSelectedQuestionIds?: string[]
) {
  const unsolved = candidates.filter((candidate) => !candidate.solved)
  const dueReviews = candidates.filter(
    (candidate) => candidate.solved && candidate.dueReview
  )
  const reviewBudget = Math.min(dueReviews.length, Math.floor(capacity * 0.15))
  const newBudget = Math.max(1, capacity - reviewBudget)
  const deterministic = interleaveByDifficulty(unsolved)

  if (aiSelectedQuestionIds) {
    const eligible = deterministic.concat(
      dueReviews.sort(
        (a, b) => (a.reviewConfidence ?? 99) - (b.reviewConfidence ?? 99)
      )
    )
    return orderCandidatesById(eligible, aiSelectedQuestionIds).slice(
      0,
      capacity
    )
  }

  return deterministic
    .slice(0, newBudget)
    .concat(
      dueReviews
        .sort((a, b) => (a.reviewConfidence ?? 99) - (b.reviewConfidence ?? 99))
        .slice(0, reviewBudget)
    )
}

function orderCandidatesById(
  candidates: RoadmapQuestionCandidate[],
  orderedIds: string[]
) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const seen = new Set<string>()
  const ordered: RoadmapQuestionCandidate[] = []

  for (const id of orderedIds) {
    const candidate = byId.get(id)
    if (!candidate || seen.has(id)) continue
    ordered.push(candidate)
    seen.add(id)
  }

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue
    ordered.push(candidate)
  }

  return ordered
}

function interleaveByDifficulty(candidates: RoadmapQuestionCandidate[]) {
  const easy = candidates.filter((candidate) => candidate.difficulty === "EASY")
  const medium = candidates.filter(
    (candidate) => candidate.difficulty === "MEDIUM"
  )
  const hard = candidates.filter((candidate) => candidate.difficulty === "HARD")
  const result: RoadmapQuestionCandidate[] = []
  let easyIndex = 0
  let mediumIndex = 0
  let hardIndex = 0

  while (
    easyIndex < easy.length ||
    mediumIndex < medium.length ||
    hardIndex < hard.length
  ) {
    if (mediumIndex < medium.length) result.push(medium[mediumIndex++])
    if (easyIndex < easy.length) result.push(easy[easyIndex++])
    if (mediumIndex < medium.length) result.push(medium[mediumIndex++])
    if (hardIndex < hard.length) result.push(hard[hardIndex++])
  }

  return result
}

function buildStudyDates(
  startDate: Date,
  endDate: Date,
  intensity: RoadmapIntensity
) {
  const dates: Date[] = []
  const cursor = new Date(startDate)
  cursor.setHours(12, 0, 0, 0)

  while (cursor <= endDate) {
    const day = cursor.getDay()
    const isStudyDay =
      intensity === "relaxed"
        ? day === 1 || day === 3 || day === 5
        : intensity === "balanced"
          ? day !== 0
          : true

    if (isStudyDay) dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  if (dates.length === 0) {
    const fallback = new Date(startDate)
    fallback.setHours(12, 0, 0, 0)
    return [fallback]
  }

  return dates
}

function resolveEndDate(
  input: { prompt: string; deadline?: string; intensity: RoadmapIntensity },
  today: Date
) {
  const explicitDeadline = input.deadline
    ? parseDateKey(input.deadline)
    : parseDeadlineFromPrompt(input.prompt, today)
  if (explicitDeadline && explicitDeadline > today) return explicitDeadline

  const fallback = new Date(today)
  fallback.setDate(
    fallback.getDate() +
      (input.intensity === "aggressive"
        ? 21
        : input.intensity === "balanced"
          ? 35
          : 49)
  )
  fallback.setHours(12, 0, 0, 0)
  return fallback
}

function parseDeadlineFromPrompt(prompt: string, today: Date) {
  const normalized = prompt.toLowerCase()
  const isoMatch = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (isoMatch) {
    return localNoon(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    )
  }

  const monthDayMatch = normalized.match(
    /\b(?:by|before|until|till)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\b/
  )
  if (monthDayMatch) {
    const month = MONTH_INDEX[monthDayMatch[1]]
    const day = Number(monthDayMatch[2])
    const date = localNoon(today.getFullYear(), month, day)
    if (date <= today) date.setFullYear(date.getFullYear() + 1)
    return date
  }

  const ordinalDayMonthMatch = normalized.match(
    /\b(?:by|before|until|till|to)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/
  )
  if (ordinalDayMonthMatch) {
    const day = Number(ordinalDayMonthMatch[1])
    const month = MONTH_INDEX[ordinalDayMonthMatch[2]]
    const date = localNoon(today.getFullYear(), month, day)
    if (date <= today) date.setFullYear(date.getFullYear() + 1)
    return date
  }

  const beforeMonthMatch = normalized.match(
    /\b(?:before|by|until|till)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/
  )
  if (beforeMonthMatch) {
    const month = MONTH_INDEX[beforeMonthMatch[1]]
    const date = localNoon(today.getFullYear(), month, 1)
    date.setDate(date.getDate() - 1)
    if (date <= today) date.setFullYear(date.getFullYear() + 1)
    return date
  }

  return null
}

function buildReason(candidate: RoadmapQuestionCandidate) {
  if (candidate.solved && candidate.dueReview) {
    return "Due review to keep this pattern fresh before interviews."
  }

  const topic = candidate.topics[0]
  if (topic) {
    return `${topic} practice selected from high-signal roadmap candidates.`
  }

  if (candidate.companyNames[0]) {
    return `${candidate.companyNames[0]}-style practice selected by frequency.`
  }

  return "Core interview practice selected for this roadmap."
}

function buildDayTheme(items: RoadmapQuestionCandidate[]) {
  const topicCounts = new Map<string, number>()
  for (const item of items) {
    for (const topic of item.topics.slice(0, 3)) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
    }
  }

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([topic]) => topic)

  if (topTopics.length > 0) return `${topTopics.join(" and ")} practice`
  return "Mixed interview practice"
}

function buildPlanName(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim()
  if (!cleaned) return "Interview Roadmap"
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return title.length > 80 ? `${title.slice(0, 77)}...` : title
}

function buildPlanSummary(
  input: { intensity: RoadmapIntensity },
  context: RoadmapPlanningContext,
  days: AiRoadmapDay[],
  itemCount: number,
  selection: AiRoadmapSelection | null
) {
  const dayCount = days.length
  const cadence =
    input.intensity === "relaxed"
      ? "light"
      : input.intensity === "aggressive"
        ? "fast"
        : "steady"
  if (selection) {
    return `A ${cadence} ${dayCount}-day roadmap with ${itemCount} scheduled questions. AI selected the question set and study order, then local scheduling placed them quickly into daily work. Strategy: ${selection.strategy}`
  }

  return `A ${cadence} ${dayCount}-day roadmap with ${itemCount} scheduled questions, prioritized from your unsolved high-signal candidates and due reviews. The AI selection step was skipped or timed out, so local scheduling used your progress, candidate difficulty, topics, and company frequency data. You have ${context.solvedCount} solved questions and ${context.dueReviewCount} due reviews in the planning context.`
}

function buildFeasibility(
  intensity: RoadmapIntensity,
  itemCount: number,
  capacity: number,
  candidateCount: number
) {
  if (itemCount < Math.min(10, capacity) && candidateCount < capacity) {
    return {
      status: "tight" as const,
      message:
        "The roadmap was limited by the number of matching questions available in the database.",
    }
  }

  if (intensity === "aggressive" && itemCount >= capacity) {
    return {
      status: "tight" as const,
      message:
        "This is a fast plan with dense daily practice; leave buffer for review and missed days.",
    }
  }

  return {
    status: "realistic" as const,
    message:
      "This roadmap uses a manageable cadence based on the selected intensity and available study window.",
  }
}

function inferGoalType(prompt: string): AiRoadmapPlan["goalType"] {
  const normalized = prompt.toLowerCase()
  if (
    /\b(company|amazon|google|meta|facebook|apple|microsoft|netflix|uber|airbnb)\b/.test(
      normalized
    )
  ) {
    return "company"
  }
  if (
    /\b(graph|tree|dynamic programming|dp|array|string|heap|greedy|backtracking|binary search)\b/.test(
      normalized
    )
  ) {
    return "topic"
  }
  return "custom"
}

function countRoadmapItems(plan: Pick<AiRoadmapPlan, "days">) {
  return plan.days.reduce((sum, day) => sum + day.items.length, 0)
}

function dedupe(values: string[]) {
  return Array.from(new Set(values))
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return localNoon(year, month - 1, day)
}

function localNoon(year: number, month: number, day: number) {
  const date = new Date(year, month, day)
  date.setHours(12, 0, 0, 0)
  return date
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function logRoadmapTiming(
  traceId: string,
  step: string,
  startedAt: number,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${traceId}] ${step} ${Date.now() - startedAt}ms`, meta)
}
