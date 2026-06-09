import { generateText, NoObjectGeneratedError, Output } from "ai"
import { getAiModel } from "@/lib/ai"
import {
  aiRoadmapPlanSchema,
  type AiRoadmapPlan,
  type RoadmapIntensity,
} from "@/lib/roadmap-ai-schemas"
import {
  buildRoadmapPlanningContext,
  type RoadmapPlanningContext,
} from "@/lib/roadmap-planning-context"
import { validateAiRoadmapPlan } from "@/lib/roadmap-plan-validator"

const ROADMAP_PLANNER_SYSTEM_PROMPT = `You are an expert technical interview study planner.

You create practical LeetCode preparation roadmaps from compact user intent.

Core rules:
- The user should not decide questions per day, weekdays, difficulty mix, or strategy. You infer those.
- Use only question IDs from the provided candidate list.
- Prefer unsolved questions for new practice.
- Use solved questions only when the itemType is "review".
- Balance difficulty progression: foundations first, then company-frequency or weak-topic pressure, then mixed interview practice.
- Keep plans humane. Relaxed means light days, balanced means steady days, aggressive means heavier days but still realistic.
- If the deadline is tight, set feasibility.status to "tight" or "unrealistic" and explain it.
- Every scheduled item needs a concise reason the user can understand.
- Do not invent questions, companies, topics, or IDs.
- Include only days that have scheduled items. Do not output rest days, empty catch-up days, or any day with an empty items array.
- Return only structured output matching the schema.
- Do not wrap the output in markdown fences, prose, or commentary.`

const ROADMAP_REPAIR_SYSTEM_PROMPT = `You repair invalid roadmap JSON.

You will receive:
- the original user request,
- validation errors,
- the allowed candidate question IDs,
- the previous invalid plan.

Return a corrected roadmap that:
- uses only allowed question IDs,
- has no duplicate new_question assignments,
- has at least one valid scheduled item,
- removes days with empty items arrays,
- fills missing top-level fields such as name, summary, goalType, startDate, endDate, intensity, inferred slugs, and feasibility,
- converts itemType "new" to "new_question",
- adds a short theme to every day,
- respects the requested intensity,
- matches the output schema exactly.

Return only the corrected structured object. Do not wrap it in markdown fences, prose, or commentary.`

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
  })

  const contextStartedAt = Date.now()
  const context = await buildRoadmapPlanningContext(input)
  logRoadmapTiming(traceId, "planner:context", contextStartedAt, {
    candidates: context.candidates.length,
    solvedCount: context.solvedCount,
    dueReviewCount: context.dueReviewCount,
  })

  const indexStartedAt = Date.now()
  const candidateById = new Map(
    context.candidates.map((c) => [c.id, { solved: c.solved }])
  )
  logRoadmapTiming(traceId, "planner:index", indexStartedAt, {
    candidates: candidateById.size,
  })

  let output: AiRoadmapPlan
  try {
    const promptStartedAt = Date.now()
    const prompt = buildRoadmapPrompt(input, context)
    logRoadmapTiming(traceId, "planner:prompt", promptStartedAt, {
      promptChars: prompt.length,
    })

    const modelStartedAt = Date.now()
    const result = await generateText({
      model: getAiModel(),
      output: Output.object({
        schema: aiRoadmapPlanSchema,
        name: "roadmap_plan",
        description: "A complete AI-generated LeetCode study roadmap.",
      }),
      system: ROADMAP_PLANNER_SYSTEM_PROMPT,
      prompt,
    })
    output = result.output
    logRoadmapTiming(traceId, "planner:model", modelStartedAt, {
      days: output.days.length,
      items: countRoadmapItems(output),
    })
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      logRoadmapEvent(traceId, "planner:model-invalid", {
        message: error.message,
        cause: error.cause instanceof Error ? error.cause.message : String(error.cause ?? ""),
        textChars: error.text?.length ?? 0,
      })

      if (!error.text) {
        throw new Error(
          `AI did not return a valid roadmap: ${error.cause ?? error.message}`
        )
      }

      const parseRepairStartedAt = Date.now()
      output = await repairAiRoadmapPlan({
        input,
        context,
        invalidPlan: parseRawRoadmapOutput(error.text) ?? error.text,
        error: error.cause instanceof Error ? error.cause.message : error.message,
        traceId,
      })
      logRoadmapTiming(traceId, "planner:parse-repair", parseRepairStartedAt, {
        days: output.days.length,
        items: countRoadmapItems(output),
      })
    } else {
      throw error
    }
  }

  const validationStartedAt = Date.now()
  const validation = validateAiRoadmapPlan(output, {
    intensity: input.intensity,
    candidateById,
  })
  logRoadmapTiming(traceId, "planner:validate", validationStartedAt, {
    valid: validation.valid,
    warnings: validation.valid ? validation.warnings.length : 0,
  })

  if (validation.valid) {
    logRoadmapTiming(traceId, "planner:complete", startedAt, {
      repaired: false,
      days: validation.plan.days.length,
      items: countRoadmapItems(validation.plan),
    })
    return { plan: validation.plan, warnings: validation.warnings }
  }

  const repairStartedAt = Date.now()
  const repaired = await repairAiRoadmapPlan({
    input,
    context,
    invalidPlan: output,
    error: validation.error,
    traceId,
  })
  logRoadmapTiming(traceId, "planner:repair", repairStartedAt, {
    days: repaired.days.length,
    items: countRoadmapItems(repaired),
  })

  const repairedValidationStartedAt = Date.now()
  const repairedValidation = validateAiRoadmapPlan(repaired, {
    intensity: input.intensity,
    candidateById,
  })
  logRoadmapTiming(traceId, "planner:repair-validate", repairedValidationStartedAt, {
    valid: repairedValidation.valid,
    warnings: repairedValidation.valid ? repairedValidation.warnings.length : 0,
  })

  if (!repairedValidation.valid) {
    throw new Error(repairedValidation.error)
  }

  logRoadmapTiming(traceId, "planner:complete", startedAt, {
    repaired: true,
    days: repairedValidation.plan.days.length,
    items: countRoadmapItems(repairedValidation.plan),
  })
  return {
    plan: repairedValidation.plan,
    warnings: repairedValidation.warnings,
  }
}

async function repairAiRoadmapPlan(params: {
  input: {
    prompt: string
    deadline?: string
    intensity: RoadmapIntensity
  }
  context: RoadmapPlanningContext
  invalidPlan: unknown
  error: string
  traceId: string
}): Promise<AiRoadmapPlan> {
  const candidateIds = params.context.candidates.map((c) => c.id)

  try {
    const repairPromptStartedAt = Date.now()
    const repairPrompt = JSON.stringify({
      originalRequest: params.input.prompt,
      intensity: params.input.intensity,
      deadline: params.input.deadline ?? null,
      validationError: params.error,
      allowedQuestionIds: candidateIds,
      invalidPlan: params.invalidPlan,
    })
    logRoadmapTiming(params.traceId, "planner:repair-prompt", repairPromptStartedAt, {
      promptChars: repairPrompt.length,
      allowedQuestionIds: candidateIds.length,
    })

    const repairModelStartedAt = Date.now()
    const result = await generateText({
      model: getAiModel(),
      output: Output.object({
        schema: aiRoadmapPlanSchema,
        name: "roadmap_plan",
        description: "A repaired AI-generated LeetCode study roadmap.",
      }),
      system: ROADMAP_REPAIR_SYSTEM_PROMPT,
      prompt: repairPrompt,
    })
    logRoadmapTiming(params.traceId, "planner:repair-model", repairModelStartedAt, {
      days: result.output.days.length,
      items: countRoadmapItems(result.output),
    })
    return result.output
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error(
        `AI repair did not return a valid roadmap: ${error.cause ?? error.message}`
      )
    }
    throw error
  }
}

function buildRoadmapPrompt(
  input: {
    prompt: string
    deadline?: string
    intensity: RoadmapIntensity
  },
  context: RoadmapPlanningContext
) {
  return JSON.stringify(
    {
      userRequest: input.prompt,
      today: context.today,
      deadline: input.deadline ?? null,
      intensity: input.intensity,
      userProgress: {
        solvedCount: context.solvedCount,
        dueReviewCount: context.dueReviewCount,
      },
      candidates: context.candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        difficulty: candidate.difficulty,
        topics: candidate.topics.slice(0, 6),
        companies: candidate.companyNames.slice(0, 5),
        frequency: candidate.maxFrequency,
        solved: candidate.solved,
        dueReview: candidate.dueReview,
        reviewConfidence: candidate.reviewConfidence,
      })),
    },
    null,
    2
  )
}

function countRoadmapItems(plan: AiRoadmapPlan) {
  return plan.days.reduce((sum, day) => sum + day.items.length, 0)
}

function parseRawRoadmapOutput(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown
  } catch {
    return null
  }
}

function logRoadmapTiming(
  traceId: string,
  step: string,
  startedAt: number,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${traceId}] ${step} ${Date.now() - startedAt}ms`, meta)
}

function logRoadmapEvent(
  traceId: string,
  step: string,
  meta: Record<string, unknown> = {}
) {
  console.log(`[roadmap:${traceId}] ${step}`, meta)
}
