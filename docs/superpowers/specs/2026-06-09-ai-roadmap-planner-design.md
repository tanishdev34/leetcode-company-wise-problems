# AI-Generated Roadmap Planner Design

> **Status:** Planning only.
> **Supersedes:** `docs/superpowers/specs/2026-06-08-roadmap-planner-design.md`
> **Goal:** Let the user describe the prep outcome they want, then have AI generate the full roadmap: schedule, pacing, strategy, exact questions, and rebalancing.

## Why This Replaces the Manual Roadmap Design

The current roadmap implementation asks the user for too many planning details:

- `components/roadmap-create-dialog.tsx` asks for goal type, company/topic, start date, end date, questions per day, study days, and strategy.
- `actions/roadmaps.ts` requires `dailyQuestionTarget`, `studyDays`, and `strategy`.
- `lib/roadmap-generator.ts` is deterministic and rule-based rather than AI-generated.
- `prisma/schema.prisma` stores `dailyQuestionTarget`, `studyDays`, and `strategy` as if they are user-authored roadmap requirements.

That flow makes the user do the planning work. The product should do the planning work.

The corrected principle:

> The user gives intent. The AI decides pacing, daily load, strategy, question ordering, and recovery behavior.

## User Experience

Roadmap creation should feel like asking a smart study coach, not filling out a planner spreadsheet.

### Primary Creation Flow

The dialog should contain:

- One large prompt field.
- Optional deadline picker.
- Optional helper chips for company/topic.
- Optional intensity selector with only three choices: `Relaxed`, `Balanced`, `Aggressive`.
- A single `Generate Roadmap` button.

Example prompts:

- `Prepare me for Google graph and DP questions before July 20.`
- `I have a Meta onsite in 3 weeks. Build me a practical DSA roadmap.`
- `I keep forgetting binary search and sliding window. Make me a recovery plan.`
- `Finish top Amazon questions and include reviews for mistakes.`

The user should not be asked:

- Number of questions per day.
- Which weekdays to study.
- Scheduling strategy.
- Difficulty mix.
- Daily distribution rules.

Those belong to the AI planner.

### Optional Inputs

Optional inputs should guide the AI, not make the user configure the algorithm:

| Field | Purpose | Required |
|---|---|---|
| Prompt | Natural language study intent | Yes |
| Deadline | Lets AI set pace and warn if unrealistic | No |
| Company chip | Helps disambiguate prompt | No |
| Topic chip | Helps disambiguate prompt | No |
| Intensity | Soft pacing preference | No, default `Balanced` |

If the prompt already includes a company/topic/deadline, the UI should infer and prefill chips where possible, but the server must not rely on client inference.

## Product Behavior

### AI Responsibilities

The AI planner decides:

- Roadmap name.
- Goal type.
- Start date.
- End date.
- Approximate number of questions.
- Daily load.
- Rest/review days.
- Difficulty progression.
- Topic ordering.
- Whether to include review items.
- Which exact questions appear on which day.
- Why each phase exists.
- Whether the deadline is realistic.

### Code Responsibilities

The code validates and constrains the AI output:

- Only known local `Question` IDs can be scheduled.
- Do not schedule duplicate questions.
- Do not schedule already solved questions unless explicitly marked as review.
- Preserve completed and locked roadmap items during rebalancing.
- Never create an empty roadmap.
- Reject or repair invalid dates.
- Cap daily load to sane values based on intensity.
- Store AI reasoning, but keep display concise.

AI plans the roadmap. Code keeps it safe.

## Data Model

The existing `Roadmap`, `RoadmapItem`, and `RoadmapEvent` models are close, but their meaning should change.

### `Roadmap`

Keep:

- `id`
- `userId`
- `name`
- `status`
- `goalType`
- `companyId`
- `topicSlug`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`
- `items`
- `events`

Add:

- `prompt`: original user request.
- `intensity`: `relaxed`, `balanced`, `aggressive`.
- `aiSummary`: short human-readable plan summary.
- `aiPlanJson`: full structured AI output for explainability and future rebalancing.
- `generationStatus`: `pending`, `running`, `done`, `error` if generation becomes async.
- `generationError`: optional error string.

Deprecate as user-authored fields:

- `dailyQuestionTarget`
- `studyDays`
- `strategy`

These may remain temporarily for migration/backward compatibility, but the UI should not expose them. If kept, they should be derived values from the AI plan, not form inputs.

### `RoadmapItem`

Keep:

- `roadmapId`
- `questionId`
- `plannedDate`
- `sortOrder`
- `status`
- `locked`

Add or reinterpret:

- `sourceReason`: AI-generated short reason, for example `core-frequency`, `topic-foundation`, `weak-area-repair`, `review-day`, `deadline-compression`.
- `aiReason`: optional longer explanation shown in the inspector.
- `itemType`: `new_question`, `review`, `catchup`, `checkpoint`.

### `RoadmapEvent`

Use events as the roadmap audit trail:

- `ai_generated`
- `ai_rebalanced`
- `item_completed`
- `item_moved`
- `item_locked`
- `sync_matched`
- `deadline_changed`
- `generation_failed`

Event payloads should include the before/after summary when AI changes the plan.

## AI Planner Architecture

Create a new AI planner module:

- `lib/roadmap-ai-planner.ts`

It should use:

- AI SDK `generateText`.
- Shared model helper from `lib/ai.ts`.
- Structured output with Zod.

Inputs:

- User ID.
- Prompt.
- Optional company/topic/deadline/intensity.
- User solved state from `UserQuestion`.
- Review state from `ReviewItem`.
- Candidate questions from `Question` and `CompanyQuestion`.
- Recent solved activity if available.
- Existing roadmap state for rebalancing.

Output shape:

```typescript
type AiRoadmapPlan = {
  name: string
  summary: string
  goalType: "company" | "topic" | "mixed" | "custom"
  inferredCompanySlug?: string
  inferredTopicSlug?: string
  startDate: string
  endDate: string
  intensity: "relaxed" | "balanced" | "aggressive"
  feasibility: {
    status: "realistic" | "tight" | "unrealistic"
    message: string
  }
  days: {
    date: string
    theme: string
    items: {
      questionId: string
      itemType: "new_question" | "review" | "catchup" | "checkpoint"
      reason: string
      order: number
    }[]
  }[]
}
```

The AI should receive candidate question IDs and metadata, not the full database. Keep prompts bounded.

## Planner Guardrails

Before saving the plan:

1. Validate all `questionId` values exist in the candidate set.
2. Drop duplicates unless one duplicate is explicitly a later review.
3. Drop solved questions unless `itemType === "review"`.
4. Enforce max items per day:
   - Relaxed: 1-2 items.
   - Balanced: 2-4 items.
   - Aggressive: 3-6 items.
5. Ensure at least one day has at least one item.
6. Ensure dates are between start and end.
7. If AI returns invalid output, retry once with a repair prompt.
8. If still invalid, return a clear error and do not create partial data.

The first implementation can generate synchronously, but the design should support async job status later.

## Roadmap Creation Flow

### Server Flow

1. Authenticate user.
2. Parse prompt and optional UI hints.
3. Fetch compact planning context:
   - solved IDs,
   - due reviews,
   - candidate questions,
   - companies/topics.
4. Call `generateAiRoadmapPlan()`.
5. Validate and repair the plan.
6. Create `Roadmap`.
7. Create `RoadmapItem` rows from AI days.
8. Create `RoadmapEvent` with type `ai_generated`.
9. Return roadmap ID, item count, feasibility status, and summary.

### Client Flow

1. User opens `New Roadmap`.
2. User types intent.
3. User optionally picks deadline/company/topic/intensity.
4. User clicks `Generate Roadmap`.
5. UI shows `Designing your plan...`.
6. On success, roadmap opens immediately.
7. Inspector shows:
   - summary,
   - feasibility warning if any,
   - first week preview,
   - why the plan is structured this way.

## Rebalancing

Rebalancing should also be AI-assisted.

Triggers:

- User clicks `Rebalance`.
- Sync marks planned questions as solved.
- User misses planned days.
- Deadline changes.
- User completes extra questions.

The rebalance prompt should include:

- Existing roadmap summary.
- Completed items.
- Locked items.
- Missed planned items.
- Remaining unsolved candidates.
- Remaining date range.
- User intensity.

Rules:

- Preserve completed items.
- Preserve locked items.
- Do not move today's items unless necessary.
- Prefer shifting missed items forward.
- Explain changes in a short event payload.

`rebalanceRoadmap()` should call `generateAiRoadmapRebalance()` instead of simply moving overdue items by old `dailyQuestionTarget`.

## UI Changes From Current Code

### Replace `RoadmapCreateDialog`

Current dialog:

- 4 steps.
- Manual goal type.
- Manual schedule.
- Manual strategy.
- Manual review screen.

New dialog:

- 1 main prompt screen.
- Optional compact advanced row.
- AI preview after generation.

Suggested layout:

- Title: `Generate Roadmap`
- Prompt textarea placeholder: `Tell me what you are preparing for...`
- Helper chips:
  - `Company`
  - `Topic`
  - `Deadline`
  - `Intensity`
- Primary button: `Generate Roadmap`

### Update `RoadmapView`

Roadmap list should stop showing `3/day`. Show instead:

- status,
- progress,
- deadline,
- intensity,
- feasibility chip if tight/unrealistic.

Timeline should show AI day themes:

- `Graph foundations`
- `Frequency sprint`
- `DP transition day`
- `Review and repair`

Inspector should show AI reasons per question in plain language.

## Migration Strategy

Because roadmap code already exists, future implementation should be a correction rather than a full rewrite.

1. Keep existing tables initially.
2. Add AI fields to `Roadmap`.
3. Add optional AI fields to `RoadmapItem`.
4. Stop rendering manual fields in the create dialog.
5. Update `createRoadmap()` to accept prompt-driven input.
6. Replace `generateRoadmapItems()` with `generateAiRoadmapPlan()` plus validation.
7. Update `rebalanceRoadmap()` to use AI-assisted rebalancing.
8. Later migration can remove or ignore `dailyQuestionTarget`, `studyDays`, and `strategy`.

## Failure States

Handle these explicitly:

- Missing AI provider config.
- AI output invalid.
- No matching questions found.
- Deadline impossible.
- User has already solved most candidates.
- OpenRouter/model call fails.

Copy examples:

- `I could not find enough unsolved Google graph questions for that deadline. Try broadening the topic or extending the date.`
- `This deadline is very tight, so I made an aggressive plan with heavier days.`
- `AI generation failed before saving anything. Please try again.`

## Testing Requirements

Unit tests:

- AI output validation drops invalid question IDs.
- Duplicate scheduled questions are removed.
- Solved questions are excluded unless review items.
- Intensity caps daily item count.
- Empty or invalid AI output fails safely.

Action tests:

- `createRoadmap()` accepts prompt-driven input.
- Roadmap creation stores prompt, summary, items, and `ai_generated` event.
- Rebalance preserves completed and locked items.

UI tests:

- Create dialog does not render questions-per-day controls.
- Create dialog does not render study-day controls.
- Create dialog does not render manual strategy cards.
- Roadmap list does not show `x/day`.

## Acceptance Criteria

- User can create a roadmap by typing one natural-language goal.
- Questions per day, study days, and strategy are not required from the user.
- AI generates exact dated assignments.
- AI explains the plan briefly.
- Roadmap creation validates AI output before saving.
- Rebalancing is AI-assisted and preserves completed/locked work.
- Existing roadmap progress, completion, pause/resume, archive, and day inspector still work.
- Wiki and implementation plans identify this doc as the current roadmap design.

