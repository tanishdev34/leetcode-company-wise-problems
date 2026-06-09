# AI Roadmap Planner Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing manual roadmap planner into an AI-generated planner where the user provides a natural-language goal and optional light hints, while AI decides pacing, strategy, dates, and exact question assignments.

**Architecture:** Keep roadmap persistence in Prisma and keep UI in `/roadmaps`, but replace manual schedule fields with an AI planning layer. Fetch bounded deterministic planning context in server code, call OpenRouter through the existing AI SDK model helper, validate the structured Zod output, then save only verified question assignments. Use AI SDK `generateText` + `Output.object({ schema })` for the MVP; reserve AI SDK tool calling or `ToolLoopAgent` for a later expansion if candidate retrieval becomes too large for a single prompt.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, AI SDK `generateText`, `Output.object`, `tool`, optional `ToolLoopAgent`, Zod, OpenRouter via `@ai-sdk/openai`.

**Spec:** `docs/superpowers/specs/2026-06-09-ai-roadmap-planner-design.md`

---

## AI SDK Findings To Follow

Use the installed AI SDK docs, not memory:

- `node_modules/ai/docs/07-reference/01-ai-sdk-core/28-output.mdx` documents `Output.object({ schema })` for typed structured output with automatic validation.
- `Output.object` throws `NoObjectGeneratedError` when the model response does not validate. Handle this explicitly and retry once with a repair prompt.
- `node_modules/ai/docs/07-reference/01-ai-sdk-core/20-tool.mdx` documents `tool({ inputSchema, execute })`, where `inputSchema` should be Zod and TypeScript infers the `execute` input type.
- `node_modules/ai/docs/03-agents/02-building-agents.mdx` documents `ToolLoopAgent`, `toolChoice`, and `stopWhen`.
- `node_modules/ai/docs/03-agents/04-loop-control.mdx` documents forced tool calling with `toolChoice: "required"` plus a final `done` tool with no `execute`.

Decision:

- **MVP:** Do not add LangChain, LangGraph, Mastra, or other tool-call libraries. AI SDK is enough and is already installed.
- **MVP:** Do not use runtime tool calling unless needed. Prefetch candidates and progress with Prisma, then ask the model for a structured plan.
- **Later:** If the candidate context becomes too large, use AI SDK tools or `ToolLoopAgent` so the model can call `searchQuestions`, `getUserProgressSummary`, and `finalizeRoadmap`.

## File Structure

- Create: `lib/roadmap-ai-schemas.ts` — Zod schemas and TypeScript types for AI planner input/output.
- Create: `lib/roadmap-planning-context.ts` — deterministic Prisma queries that build compact candidate context.
- Create: `lib/roadmap-ai-planner.ts` — OpenRouter/AI SDK planning and rebalancing calls.
- Create: `lib/roadmap-plan-validator.ts` — deterministic guardrails for AI output.
- Modify: `actions/roadmaps.ts` — change `createRoadmap()` input shape and use AI planner; update `rebalanceRoadmap()`.
- Modify: `components/roadmap-create-dialog.tsx` — replace multi-step manual dialog with intent-first AI generation UI.
- Modify: `components/roadmap-view.tsx` — remove `x/day`, show AI summary/intensity/feasibility/day themes.
- Modify: `prisma/schema.prisma` — add AI roadmap metadata fields.
- Create: Prisma migration under `prisma/migrations/`.
- Add/modify tests under `tests/` for schemas, validators, server action behavior, and create-dialog UI.
- Modify wiki docs: `docs/wiki/data-model.md`, `docs/wiki/actions.md`, `docs/wiki/components.md`, `docs/wiki/pages.md`, `docs/wiki/index.md`, and possibly `docs/wiki/future-designs.md`.

## Task 1: Add AI Roadmap Metadata To Prisma

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_ai_roadmap_fields/migration.sql`
- Modify: `docs/wiki/data-model.md`

- [ ] **Step 1: Update the Prisma schema**

Add fields to `Roadmap`:

```prisma
model Roadmap {
  // existing fields...
  prompt           String?
  intensity        String  @default("balanced") // relaxed | balanced | aggressive
  aiSummary        String?
  aiPlanJson       Json?
  feasibility      String  @default("realistic") // realistic | tight | unrealistic
  feasibilityNote  String?
  generationStatus String  @default("done") // pending | running | done | error
  generationError  String?
}
```

Add fields to `RoadmapItem`:

```prisma
model RoadmapItem {
  // existing fields...
  itemType String  @default("new_question") // new_question | review | catchup | checkpoint
  aiReason String?
  dayTheme String?
}
```

Keep `dailyQuestionTarget`, `studyDays`, and `strategy` for now to avoid destructive migration churn, but treat them as deprecated derived/backward-compatible fields.

- [ ] **Step 2: Generate the migration**

Run:

```bash
bunx prisma migrate dev --name add-ai-roadmap-fields
```

Expected: migration is created and Prisma client regenerates.

- [ ] **Step 3: Update data-model wiki**

In `docs/wiki/data-model.md`, update the `Roadmap` and `RoadmapItem` sections:

- Mark `dailyQuestionTarget`, `studyDays`, and `strategy` as deprecated implementation details.
- Add `prompt`, `intensity`, `aiSummary`, `aiPlanJson`, `feasibility`, `feasibilityNote`, `generationStatus`, `generationError`.
- Add `itemType`, `aiReason`, `dayTheme`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations docs/wiki/data-model.md
git commit -m "feat: add AI roadmap metadata fields"
```

## Task 2: Define AI Planner Schemas

**Files:**
- Create: `lib/roadmap-ai-schemas.ts`
- Test: `tests/lib/roadmap-ai-schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/lib/roadmap-ai-schemas.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { aiRoadmapPlanSchema } from "@/lib/roadmap-ai-schemas"

describe("aiRoadmapPlanSchema", () => {
  it("accepts a valid AI roadmap plan", () => {
    const result = aiRoadmapPlanSchema.safeParse({
      name: "Google Graph Sprint",
      summary: "Build graph foundations, then move into frequency-ranked practice.",
      goalType: "company",
      startDate: "2026-06-09",
      endDate: "2026-06-30",
      intensity: "balanced",
      feasibility: {
        status: "realistic",
        message: "The plan is realistic with moderate daily practice.",
      },
      days: [
        {
          date: "2026-06-10",
          theme: "Graph foundations",
          items: [
            {
              questionId: "q1",
              itemType: "new_question",
              reason: "Core graph traversal warmup.",
              order: 0,
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid item types", () => {
    const result = aiRoadmapPlanSchema.safeParse({
      name: "Bad Plan",
      summary: "Invalid.",
      goalType: "custom",
      startDate: "2026-06-09",
      endDate: "2026-06-30",
      intensity: "balanced",
      feasibility: { status: "realistic", message: "ok" },
      days: [
        {
          date: "2026-06-10",
          theme: "Bad",
          items: [
            {
              questionId: "q1",
              itemType: "random",
              reason: "Invalid item type.",
              order: 0,
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run test tests/lib/roadmap-ai-schemas.test.ts
```

Expected: fail because `lib/roadmap-ai-schemas.ts` does not exist.

- [ ] **Step 3: Create schemas**

Create `lib/roadmap-ai-schemas.ts`:

```typescript
import { z } from "zod"

export const roadmapGoalTypeSchema = z.enum(["company", "topic", "mixed", "custom"])
export const roadmapIntensitySchema = z.enum(["relaxed", "balanced", "aggressive"])
export const roadmapFeasibilitySchema = z.enum(["realistic", "tight", "unrealistic"])
export const roadmapItemTypeSchema = z.enum([
  "new_question",
  "review",
  "catchup",
  "checkpoint",
])

export const aiRoadmapItemSchema = z.object({
  questionId: z.string().min(1).describe("Existing local Question.id to schedule."),
  itemType: roadmapItemTypeSchema.describe("Why this item is scheduled."),
  reason: z
    .string()
    .min(8)
    .max(220)
    .describe("Short user-facing explanation for why this question belongs here."),
  order: z.number().int().min(0).describe("Display order within the day."),
})

export const aiRoadmapDaySchema = z.object({
  date: z
    .string()
    .regex(/^\\d{4}-\\d{2}-\\d{2}$/)
    .describe("ISO date for this study day, YYYY-MM-DD."),
  theme: z
    .string()
    .min(3)
    .max(80)
    .describe("Short theme for the day, e.g. Graph foundations."),
  items: z.array(aiRoadmapItemSchema).max(6),
})

export const aiRoadmapPlanSchema = z.object({
  name: z.string().min(3).max(80),
  summary: z.string().min(20).max(700),
  goalType: roadmapGoalTypeSchema,
  inferredCompanySlug: z.string().nullable(),
  inferredTopicSlug: z.string().nullable(),
  startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  intensity: roadmapIntensitySchema,
  feasibility: z.object({
    status: roadmapFeasibilitySchema,
    message: z.string().min(8).max(300),
  }),
  days: z.array(aiRoadmapDaySchema).min(1).max(120),
})

export type AiRoadmapPlan = z.infer<typeof aiRoadmapPlanSchema>
export type AiRoadmapDay = z.infer<typeof aiRoadmapDaySchema>
export type AiRoadmapItem = z.infer<typeof aiRoadmapItemSchema>
export type RoadmapIntensity = z.infer<typeof roadmapIntensitySchema>
```

Important: use `nullable()` rather than optional properties for `inferredCompanySlug` and `inferredTopicSlug`, because strict structured output providers may not support optional schema properties reliably.

- [ ] **Step 4: Run schema tests**

Run:

```bash
bun run test tests/lib/roadmap-ai-schemas.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add lib/roadmap-ai-schemas.ts tests/lib/roadmap-ai-schemas.test.ts
git commit -m "feat: define AI roadmap output schemas"
```

## Task 3: Build Deterministic Planning Context

**Files:**
- Create: `lib/roadmap-planning-context.ts`
- Test: `tests/lib/roadmap-planning-context.test.ts`

- [ ] **Step 1: Define compact planning context types**

Create `lib/roadmap-planning-context.ts` with exported types:

```typescript
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
```

- [ ] **Step 2: Implement candidate builder**

Add:

```typescript
import { prisma } from "@/lib/db"

export async function buildRoadmapPlanningContext(input: {
  userId: string
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
}): Promise<RoadmapPlanningContext> {
  const [solved, reviews, companies, questions] = await Promise.all([
    prisma.userQuestion.findMany({
      where: { userId: input.userId },
      select: { questionId: true, solved: true },
    }),
    prisma.reviewItem.findMany({
      where: { userId: input.userId },
      select: { questionId: true, confidence: true, nextReviewAt: true },
    }),
    prisma.company.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.question.findMany({
      where: buildCandidateWhere(input),
      select: {
        id: true,
        title: true,
        difficulty: true,
        topics: true,
        companyQuestions: {
          select: {
            frequency: true,
            company: { select: { name: true } },
          },
          where: { timePeriod: "ALL" },
        },
      },
      take: 180,
    }),
  ])

  const solvedMap = new Map(solved.map((s) => [s.questionId, s.solved]))
  const reviewMap = new Map(reviews.map((r) => [r.questionId, r]))
  const now = new Date()
  const topicSet = new Set<string>()

  const candidates = questions.map((q) => {
    for (const topic of q.topics) topicSet.add(topic)
    const review = reviewMap.get(q.id)
    return {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      topics: q.topics,
      companyNames: q.companyQuestions.map((cq) => cq.company.name),
      maxFrequency: Math.max(0, ...q.companyQuestions.map((cq) => cq.frequency)),
      solved: solvedMap.get(q.id) === true,
      dueReview: review ? review.nextReviewAt <= now : false,
      reviewConfidence: review?.confidence ?? null,
    }
  })

  return {
    today: toDateKey(now),
    candidates,
    solvedCount: solved.filter((s) => s.solved).length,
    dueReviewCount: candidates.filter((c) => c.dueReview).length,
    availableCompanies: companies,
    availableTopics: Array.from(topicSet).sort(),
  }
}
```

Add helper functions:

```typescript
function buildCandidateWhere(input: {
  companyId?: string
  topicSlug?: string
}) {
  if (input.companyId) {
    return {
      companyQuestions: {
        some: { companyId: input.companyId, timePeriod: "ALL" as const },
      },
    }
  }

  if (input.topicSlug) {
    return { topics: { has: input.topicSlug } }
  }

  return {}
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}
```

- [ ] **Step 3: Add tests with mocked Prisma if project test patterns support it**

If mocking Prisma is already established, test:

- company filter creates company-scoped candidates,
- topic filter creates topic-scoped candidates,
- solved/review state is attached.

If not established, keep this module covered through action integration tests in Task 6.

- [ ] **Step 4: Commit**

```bash
git add lib/roadmap-planning-context.ts tests/lib/roadmap-planning-context.test.ts
git commit -m "feat: build roadmap planning context"
```

## Task 4: Add Deterministic Plan Validator

**Files:**
- Create: `lib/roadmap-plan-validator.ts`
- Test: `tests/lib/roadmap-plan-validator.test.ts`

- [ ] **Step 1: Write failing validator tests**

Create tests for:

- invalid question IDs are dropped,
- duplicate new-question items are dropped,
- solved questions are dropped unless `itemType` is `review`,
- daily item counts are capped by intensity,
- completed/locked items are preserved during rebalance validation.

Example:

```typescript
import { describe, expect, it } from "vitest"
import { validateAiRoadmapPlan } from "@/lib/roadmap-plan-validator"
import type { AiRoadmapPlan } from "@/lib/roadmap-ai-schemas"

describe("validateAiRoadmapPlan", () => {
  it("drops invalid and duplicate questions", () => {
    const plan: AiRoadmapPlan = {
      name: "Plan",
      summary: "A useful plan with enough detail.",
      goalType: "custom",
      inferredCompanySlug: null,
      inferredTopicSlug: null,
      startDate: "2026-06-09",
      endDate: "2026-06-20",
      intensity: "balanced",
      feasibility: { status: "realistic", message: "Good pace." },
      days: [
        {
          date: "2026-06-10",
          theme: "Start",
          items: [
            { questionId: "q1", itemType: "new_question", reason: "Good first question.", order: 0 },
            { questionId: "q1", itemType: "new_question", reason: "Duplicate.", order: 1 },
            { questionId: "missing", itemType: "new_question", reason: "Invalid.", order: 2 },
          ],
        },
      ],
    }

    const result = validateAiRoadmapPlan(plan, {
      intensity: "balanced",
      candidateById: new Map([
        ["q1", { solved: false }],
      ]),
    })

    expect(result.valid).toBe(true)
    expect(result.plan.days[0].items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
bun run test tests/lib/roadmap-plan-validator.test.ts
```

Expected: fail because validator does not exist.

- [ ] **Step 3: Implement validator**

Create `lib/roadmap-plan-validator.ts`:

```typescript
import type { AiRoadmapPlan, RoadmapIntensity } from "@/lib/roadmap-ai-schemas"

const INTENSITY_LIMITS: Record<RoadmapIntensity, number> = {
  relaxed: 2,
  balanced: 4,
  aggressive: 6,
}

export function validateAiRoadmapPlan(
  plan: AiRoadmapPlan,
  context: {
    intensity: RoadmapIntensity
    candidateById: Map<string, { solved: boolean }>
  }
): { valid: true; plan: AiRoadmapPlan; warnings: string[] } | { valid: false; error: string } {
  const warnings: string[] = []
  const seenNewQuestions = new Set<string>()
  const maxPerDay = INTENSITY_LIMITS[context.intensity]

  const cleanedDays = plan.days
    .map((day) => {
      const cleanItems = day.items
        .filter((item) => {
          const candidate = context.candidateById.get(item.questionId)
          if (!candidate) {
            warnings.push(`Dropped unknown question ${item.questionId}`)
            return false
          }

          if (candidate.solved && item.itemType !== "review") {
            warnings.push(`Dropped solved question ${item.questionId}`)
            return false
          }

          if (item.itemType === "new_question") {
            if (seenNewQuestions.has(item.questionId)) {
              warnings.push(`Dropped duplicate question ${item.questionId}`)
              return false
            }
            seenNewQuestions.add(item.questionId)
          }

          return true
        })
        .sort((a, b) => a.order - b.order)
        .slice(0, maxPerDay)
        .map((item, order) => ({ ...item, order }))

      if (day.items.length > cleanItems.length && cleanItems.length === maxPerDay) {
        warnings.push(`Capped ${day.date} to ${maxPerDay} items`)
      }

      return { ...day, items: cleanItems }
    })
    .filter((day) => day.items.length > 0)

  if (cleanedDays.length === 0) {
    return { valid: false, error: "AI roadmap did not contain any usable question assignments" }
  }

  return {
    valid: true,
    plan: { ...plan, days: cleanedDays },
    warnings,
  }
}
```

- [ ] **Step 4: Run validator tests**

Run:

```bash
bun run test tests/lib/roadmap-plan-validator.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add lib/roadmap-plan-validator.ts tests/lib/roadmap-plan-validator.test.ts
git commit -m "feat: validate AI roadmap plans"
```

## Task 5: Implement AI Planner With System Prompts

**Files:**
- Create: `lib/roadmap-ai-planner.ts`
- Test: `tests/lib/roadmap-ai-planner.test.ts`

- [ ] **Step 1: Create the main system prompt**

In `lib/roadmap-ai-planner.ts`, define:

```typescript
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
- Return only structured output matching the schema.`
```

- [ ] **Step 2: Create the repair system prompt**

```typescript
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
- respects the requested intensity,
- matches the output schema exactly.`
```

- [ ] **Step 3: Implement `generateAiRoadmapPlan()`**

Use AI SDK structured output:

```typescript
import { generateText, NoObjectGeneratedError, Output } from "ai"
import { getAiModel } from "@/lib/ai"
import { aiRoadmapPlanSchema, type AiRoadmapPlan, type RoadmapIntensity } from "@/lib/roadmap-ai-schemas"
import { buildRoadmapPlanningContext } from "@/lib/roadmap-planning-context"
import { validateAiRoadmapPlan } from "@/lib/roadmap-plan-validator"

export async function generateAiRoadmapPlan(input: {
  userId: string
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
  intensity: RoadmapIntensity
}): Promise<{
  plan: AiRoadmapPlan
  warnings: string[]
}> {
  const context = await buildRoadmapPlanningContext(input)
  const candidateById = new Map(context.candidates.map((c) => [c.id, { solved: c.solved }]))

  const { output } = await generateText({
    model: getAiModel(),
    output: Output.object({
      schema: aiRoadmapPlanSchema,
      name: "roadmap_plan",
      description: "A complete AI-generated LeetCode study roadmap.",
    }),
    system: ROADMAP_PLANNER_SYSTEM_PROMPT,
    prompt: buildRoadmapPrompt(input, context),
  })

  const validation = validateAiRoadmapPlan(output, {
    intensity: input.intensity,
    candidateById,
  })

  if (validation.valid) {
    return { plan: validation.plan, warnings: validation.warnings }
  }

  const repaired = await repairAiRoadmapPlan({
    input,
    context,
    invalidPlan: output,
    error: validation.error,
  })

  const repairedValidation = validateAiRoadmapPlan(repaired, {
    intensity: input.intensity,
    candidateById,
  })

  if (!repairedValidation.valid) {
    throw new Error(repairedValidation.error)
  }

  return { plan: repairedValidation.plan, warnings: repairedValidation.warnings }
}
```

- [ ] **Step 4: Implement prompt builder**

Keep context compact:

```typescript
function buildRoadmapPrompt(
  input: {
    prompt: string
    deadline?: string
    intensity: RoadmapIntensity
  },
  context: Awaited<ReturnType<typeof buildRoadmapPlanningContext>>
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
```

- [ ] **Step 5: Handle `NoObjectGeneratedError`**

Wrap calls:

```typescript
try {
  // generateText call
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    throw new Error(`AI did not return a valid roadmap: ${error.cause ?? error.message}`)
  }
  throw error
}
```

- [ ] **Step 6: Add optional tool-calling design but do not implement in MVP**

Add comments or a separate exported placeholder only if useful:

```typescript
// Future option: if candidate context exceeds prompt limits, use AI SDK ToolLoopAgent
// with tools searchQuestions, getProgressSummary, and a final done tool. Do not
// add external tool-calling libraries until AI SDK proves insufficient.
```

- [ ] **Step 7: Add tests**

Mock `generateText` if local test patterns allow. Test:

- planner calls validator,
- invalid first output triggers repair,
- `NoObjectGeneratedError` becomes a clear app error.

- [ ] **Step 8: Commit**

```bash
git add lib/roadmap-ai-planner.ts tests/lib/roadmap-ai-planner.test.ts
git commit -m "feat: generate AI roadmap plans"
```

## Task 6: Update Server Actions

**Files:**
- Modify: `actions/roadmaps.ts`
- Test: `tests/actions/roadmaps.test.ts`

- [ ] **Step 1: Change create input type**

Replace the current input:

```typescript
{
  name: string
  goalType: string
  companyId?: string
  topicSlug?: string
  startDate: string
  endDate: string
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: string
}
```

With:

```typescript
{
  prompt: string
  companyId?: string
  topicSlug?: string
  deadline?: string
  intensity?: "relaxed" | "balanced" | "aggressive"
}
```

- [ ] **Step 2: Validate lightweight user input**

In `createRoadmap()`:

```typescript
if (!input.prompt.trim()) {
  return { success: false, error: "Describe what you want to prepare for" }
}

if (input.prompt.length > 1000) {
  return { success: false, error: "Roadmap prompt must be 1000 characters or less" }
}
```

- [ ] **Step 3: Call AI planner**

Use:

```typescript
const intensity = input.intensity ?? "balanced"
const { plan, warnings } = await generateAiRoadmapPlan({
  userId: session.user.id,
  prompt: input.prompt.trim(),
  companyId: input.companyId,
  topicSlug: input.topicSlug,
  deadline: input.deadline,
  intensity,
})
```

- [ ] **Step 4: Persist the AI plan**

Create the roadmap:

```typescript
const roadmap = await prisma.roadmap.create({
  data: {
    userId: session.user.id,
    name: plan.name,
    goalType: plan.goalType,
    companyId: input.companyId || null,
    topicSlug: input.topicSlug || plan.inferredTopicSlug || null,
    startDate: new Date(`${plan.startDate}T00:00:00`),
    endDate: new Date(`${plan.endDate}T00:00:00`),
    prompt: input.prompt.trim(),
    intensity: plan.intensity,
    aiSummary: plan.summary,
    aiPlanJson: plan,
    feasibility: plan.feasibility.status,
    feasibilityNote: plan.feasibility.message,
    generationStatus: "done",
  },
})
```

Create items:

```typescript
await prisma.roadmapItem.createMany({
  data: plan.days.flatMap((day) =>
    day.items.map((item) => ({
      roadmapId: roadmap.id,
      questionId: item.questionId,
      plannedDate: new Date(`${day.date}T00:00:00`),
      sortOrder: item.order,
      sourceReason: item.reason.slice(0, 180),
      aiReason: item.reason,
      itemType: item.itemType,
      dayTheme: day.theme,
    }))
  ),
})
```

Create event:

```typescript
await prisma.roadmapEvent.create({
  data: {
    roadmapId: roadmap.id,
    type: "ai_generated",
    payload: {
      itemCount,
      feasibility: plan.feasibility,
      warnings,
    },
  },
})
```

- [ ] **Step 5: Return richer data**

Return:

```typescript
return {
  success: true,
  data: {
    id: roadmap.id,
    itemCount,
    feasibility: plan.feasibility.status,
    summary: plan.summary,
  },
}
```

- [ ] **Step 6: Update `getRoadmaps()` and `getRoadmapDetail()`**

Include:

- `prompt`
- `intensity`
- `aiSummary`
- `feasibility`
- `feasibilityNote`
- item `itemType`
- item `aiReason`
- item `dayTheme`

Remove `dailyQuestionTarget` from returned UI types unless needed only for legacy display.

- [ ] **Step 7: Replace `rebalanceRoadmap()` internals**

For this task, add AI rebalance wiring if `generateAiRoadmapRebalance()` is implemented. If not, change copy and event types so the current deterministic rebalance is clearly temporary.

Preferred:

```typescript
const { plan, warnings } = await generateAiRoadmapRebalance({
  userId: session.user.id,
  roadmapId,
})
```

Then update only unlocked, uncompleted future items. Preserve completed and locked rows.

- [ ] **Step 8: Add action tests**

Test:

- `createRoadmap()` accepts prompt-only input.
- `createRoadmap()` rejects empty prompt.
- `createRoadmap()` stores AI metadata and items.
- `getRoadmaps()` does not require or return manual `dailyQuestionTarget` for display.

- [ ] **Step 9: Commit**

```bash
git add actions/roadmaps.ts tests/actions/roadmaps.test.ts
git commit -m "feat: create roadmaps from AI-generated plans"
```

## Task 7: Replace The Create Dialog

**Files:**
- Modify: `components/roadmap-create-dialog.tsx`
- Test: `tests/components/roadmap-create-dialog.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create tests:

```typescript
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RoadmapCreateDialog } from "@/components/roadmap-create-dialog"

vi.mock("@/actions/roadmaps", () => ({
  createRoadmap: vi.fn(),
  getCompaniesForSelect: vi.fn().mockResolvedValue({ success: true, data: { companies: [] } }),
  getTopicsForSelect: vi.fn().mockResolvedValue({ success: true, data: { topics: [] } }),
}))

describe("RoadmapCreateDialog", () => {
  it("uses an AI intent prompt instead of manual planning controls", () => {
    render(<RoadmapCreateDialog open onOpenChange={() => {}} onCreated={() => {}} />)

    expect(screen.getByText("Generate Roadmap")).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tell me what you are preparing/i)).toBeInTheDocument()
    expect(screen.queryByText(/questions per day/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/study days/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pick a strategy/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run test tests/components/roadmap-create-dialog.test.tsx
```

Expected: fail because current dialog renders manual controls.

- [ ] **Step 3: Replace component state**

Use:

```typescript
const [prompt, setPrompt] = useState("")
const [deadline, setDeadline] = useState("")
const [companyId, setCompanyId] = useState("")
const [topicSlug, setTopicSlug] = useState("")
const [intensity, setIntensity] = useState<"relaxed" | "balanced" | "aggressive">("balanced")
```

Remove:

- `step`
- `name`
- `goalType`
- `startDate`
- `endDate`
- `dailyTarget`
- `studyDays`
- `strategy`
- `STRATEGIES`
- `DAYS`

- [ ] **Step 4: Replace the form UI**

Dialog content:

```tsx
<DialogHeader>
  <DialogTitle>Generate Roadmap</DialogTitle>
  <DialogDescription>
    Describe your interview goal. AI will choose the pace, schedule, and questions.
  </DialogDescription>
</DialogHeader>

<Textarea
  value={prompt}
  onChange={(event) => setPrompt(event.target.value)}
  placeholder="Tell me what you are preparing for..."
/>
```

Add compact optional controls:

- deadline date input,
- company select,
- topic select,
- intensity segmented buttons.

Do not hide them behind a multi-step wizard. Keep the main prompt visually dominant.

- [ ] **Step 5: Update create call**

```typescript
const result = await createRoadmap({
  prompt,
  companyId: companyId || undefined,
  topicSlug: topicSlug || undefined,
  deadline: deadline || undefined,
  intensity,
})
```

- [ ] **Step 6: Update loading and success copy**

Button states:

- idle: `Generate Roadmap`
- loading: `Designing your plan...`

On success, call:

```typescript
onCreated(result.data.id)
```

If `onCreated` currently takes no args, either update prop type or keep no-arg and select newest roadmap in parent. Prefer passing ID.

- [ ] **Step 7: Run UI test**

Run:

```bash
bun run test tests/components/roadmap-create-dialog.test.tsx
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add components/roadmap-create-dialog.tsx tests/components/roadmap-create-dialog.test.tsx
git commit -m "feat: simplify roadmap creation with AI prompt"
```

## Task 8: Update Roadmap View For AI Metadata

**Files:**
- Modify: `components/roadmap-view.tsx`
- Test: `tests/components/roadmap-view.test.tsx`

- [ ] **Step 1: Update UI types**

Remove `dailyQuestionTarget` from primary display types. Add:

```typescript
prompt: string | null
intensity: string
aiSummary: string | null
feasibility: string
feasibilityNote: string | null
```

For items add:

```typescript
itemType: string
aiReason: string | null
dayTheme: string | null
```

- [ ] **Step 2: Change roadmap list display**

Replace:

```tsx
<span className="ml-auto">{r.dailyQuestionTarget}/day</span>
```

With:

```tsx
<span className="ml-auto capitalize">{r.intensity}</span>
```

Add a small feasibility chip when `feasibility !== "realistic"`.

- [ ] **Step 3: Group by date plus day theme**

When rendering day rows, derive a day theme from the first item:

```typescript
const theme = items.find((item) => item.dayTheme)?.dayTheme
```

Show it below the date/count.

- [ ] **Step 4: Update inspector item reasons**

Show:

- `item.itemType`
- `item.aiReason ?? item.sourceReason`

Use concise labels; do not expose raw enum names if avoidable.

- [ ] **Step 5: Show plan summary**

When no day is selected, the right inspector should show:

- `detail.aiSummary`
- `detail.feasibilityNote`
- prompt preview.

This makes the AI-generated plan explainable.

- [ ] **Step 6: Update tests**

Test that:

- roadmap list does not render `/day`,
- intensity is rendered,
- day themes render,
- AI summary renders in inspector.

- [ ] **Step 7: Commit**

```bash
git add components/roadmap-view.tsx tests/components/roadmap-view.test.tsx
git commit -m "feat: show AI roadmap metadata"
```

## Task 9: Optional Tool-Calling Planner Spike

**Files:**
- Optional create: `lib/roadmap-ai-tools.ts`
- Optional test: `tests/lib/roadmap-ai-tools.test.ts`

Do this only if the MVP prompt-context approach fails because the candidate list is too large or model quality is poor.

- [ ] **Step 1: Define AI SDK tools**

Use AI SDK `tool()`:

```typescript
import { tool } from "ai"
import { z } from "zod"

export function createRoadmapPlanningTools(userId: string) {
  return {
    searchQuestions: tool({
      description: "Search local LeetCode questions by topic, company, difficulty, or title.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).nullable(),
        limit: z.number().int().min(1).max(40),
      }),
      execute: async ({ query, difficulty, limit }) => {
        // Prisma search implementation here.
      },
    }),
    getUserProgressSummary: tool({
      description: "Get compact solved and due-review progress for the current user.",
      inputSchema: z.object({}),
      execute: async () => {
        // Return counts and weak topics only, not full DB rows.
      },
    }),
  }
}
```

- [ ] **Step 2: Use ToolLoopAgent only if needed**

If used, follow the AI SDK docs:

```typescript
import { ToolLoopAgent, Output, stepCountIs } from "ai"

const agent = new ToolLoopAgent({
  model: getAiModel(),
  tools: createRoadmapPlanningTools(userId),
  output: Output.object({ schema: aiRoadmapPlanSchema }),
  stopWhen: stepCountIs(8),
})
```

Keep step count low to control OpenRouter cost.

- [ ] **Step 3: Add final `done` tool only for forced tool workflows**

If forcing tool usage, use `toolChoice: "required"` and a `done` tool without `execute`, as documented by AI SDK loop-control docs. Do not use this in MVP unless you need a strict multi-step planner.

- [ ] **Step 4: Do not add external libraries**

Do not add LangChain, LangGraph, Mastra, or CopilotKit for this planner. They add abstraction and state management the app does not need yet.

## Task 10: Update Docs

**Files:**
- Modify: `docs/wiki/actions.md`
- Modify: `docs/wiki/components.md`
- Modify: `docs/wiki/pages.md`
- Modify: `docs/wiki/data-model.md`
- Modify: `docs/wiki/index.md`
- Modify: `docs/wiki/future-designs.md`
- Modify: `docs/superpowers/plans/2026-06-08-cleanup-wave-plan.md` if it remains in use.

- [ ] **Step 1: Update actions wiki**

In `docs/wiki/actions.md`, update `actions/roadmaps.ts`:

- `createRoadmap(input)` now accepts prompt/deadline/company/topic/intensity.
- It calls `lib/roadmap-ai-planner.ts`.
- It stores AI metadata and `ai_generated` event.
- `rebalanceRoadmap()` is AI-assisted.

- [ ] **Step 2: Update components wiki**

In `docs/wiki/components.md`, update `RoadmapCreateDialog`:

- intent prompt,
- optional helper chips,
- no questions-per-day,
- no study-day toggles,
- no strategy cards.

- [ ] **Step 3: Update pages wiki**

In `docs/wiki/pages.md`, update `/roadmaps` behavior:

- AI-generated roadmaps,
- user intent creation,
- AI summary and feasibility state.

- [ ] **Step 4: Update data model wiki**

Already partially done in Task 1. Verify it matches final fields.

- [ ] **Step 5: Update future design docs**

Ensure `docs/wiki/future-designs.md` points to:

- `docs/superpowers/specs/2026-06-09-ai-roadmap-planner-design.md`
- this implementation plan.

- [ ] **Step 6: Mark old cleanup plan stale**

If `docs/superpowers/plans/2026-06-08-cleanup-wave-plan.md` still instructs coding agents to implement manual `dailyQuestionTarget`, `studyDays`, or `strategy`, add a note at the top:

```markdown
> Roadmap portion superseded by `docs/superpowers/plans/2026-06-09-ai-roadmap-planner-implementation.md`.
```

- [ ] **Step 7: Commit docs**

```bash
git add docs/wiki docs/superpowers/plans/2026-06-08-cleanup-wave-plan.md
git commit -m "docs: document AI roadmap planner implementation"
```

## Task 11: Final Verification

**Files:**
- All modified files.

- [ ] **Step 1: Search for stale manual UI references**

Run:

```bash
rg -n "Questions per Day|Study Days|Pick a strategy|dailyQuestionTarget|studyDays|strategy" components/roadmap-create-dialog.tsx components/roadmap-view.tsx actions/roadmaps.ts lib/roadmap-ai-planner.ts docs/wiki
```

Expected:

- No create-dialog references to `Questions per Day`, `Study Days`, or strategy cards.
- `dailyQuestionTarget`, `studyDays`, and `strategy` appear only as deprecated/migration notes or legacy schema fields.

- [ ] **Step 2: Run focused tests**

Run:

```bash
bun run test tests/lib/roadmap-ai-schemas.test.ts tests/lib/roadmap-plan-validator.test.ts tests/components/roadmap-create-dialog.test.tsx
```

Expected: pass.

- [ ] **Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 4: Run full tests**

Run:

```bash
bun run test
```

Expected: pass. If failures are unrelated to roadmap work, document them with file/test names.

- [ ] **Step 5: Manual UI check**

Run:

```bash
bun run dev
```

Open `/roadmaps` and verify:

- New Roadmap opens a single prompt-first dialog.
- User can type `Prepare me for Google graphs before July 20`.
- No questions/day, study days, or strategy controls appear.
- Generation creates a roadmap with dated assignments.
- List shows intensity/feasibility, not `x/day`.
- Day inspector shows AI reasons.

- [ ] **Step 6: Final commit**

If earlier tasks were not committed separately:

```bash
git add prisma/schema.prisma prisma/migrations lib actions components tests docs
git commit -m "feat: generate roadmaps with AI planner"
```

