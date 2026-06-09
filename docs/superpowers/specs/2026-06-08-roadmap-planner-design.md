# Multi-Roadmap Study Planner Design

> **Status:** Superseded by `docs/superpowers/specs/2026-06-09-ai-roadmap-planner-design.md`.
> **Do not implement this manual-input flow for roadmap creation.**
> **Historical note:** This file is kept as background for the first roadmap concept, but its questions-per-day, study-days, and strategy inputs are no longer the desired product direction.
> **Goal:** Let the user create multiple company/topic/date-based preparation roadmaps that assign exact questions per day.

## Problem

The current `StudyPlan` model supports manually adding questions to days of a week. That is useful, but it does not solve the real question: "I want to finish Google arrays and graphs by June 30. What exactly should I solve each day?"

The new roadmap system should generate a concrete schedule, adapt as the user solves questions, and coexist with multiple goals.

## Product Shape

Roadmaps are named plans with:

- Target company, topic, difficulty mix, or custom question set.
- Start date and deadline.
- Daily capacity.
- Preferred study days.
- Optional review days.
- Generated day-by-day assignments.
- Rebalancing when the user misses a day or solves extra questions.

Examples:

- "Google Graphs by July 15"
- "Meta Top 100 in 30 days"
- "DP Mediums before onsite"
- "System design plus hard DSA warmup"

## Route and Navigation

Add one primary destination:

- `/roadmaps`

Suggested nested states:

- `/roadmaps` shows list plus selected roadmap.
- `/roadmaps/new` can be a panel or command palette flow, not necessarily a standalone page.
- `/roadmaps/[id]` is optional if URL addressability is needed.

Remove or migrate:

- Current `/planner` becomes `/roadmaps` after migration.
- Existing `StudyPlan` and `StudyPlanItem` data should be migrated or treated as legacy weekly roadmaps.

## Roadmap Creation Flow

Use a compact multi-step panel:

1. **Goal**
   - Company.
   - Topic.
   - Custom query.
   - Difficulty target.
2. **Deadline**
   - Start date.
   - End date.
   - Days per week.
   - Max questions per day.
3. **Strategy**
   - Balanced.
   - Frequency-first.
   - Weak-topic repair.
   - Interview sprint.
4. **Preview**
   - Total questions.
   - Daily load.
   - Hard-day warnings.
   - First week preview.

Creation should fail early if the goal is impossible, for example "80 hard questions in 4 days at 2 questions/day".

## Data Model

Recommended Prisma models:

### `Roadmap`

- `id`
- `userId`
- `name`
- `status`: `active`, `paused`, `completed`, `archived`
- `goalType`: `company`, `topic`, `mixed`, `custom`
- `companyId`
- `topicSlug`
- `startDate`
- `endDate`
- `dailyQuestionTarget`
- `studyDays`: integer array or JSON, values `0-6`
- `strategy`
- `createdAt`
- `updatedAt`

### `RoadmapItem`

- `id`
- `roadmapId`
- `questionId`
- `plannedDate`
- `sortOrder`
- `status`: `planned`, `in_progress`, `completed`, `skipped`, `moved`
- `sourceReason`: short reason such as `company-frequency`, `weak-topic`, `review-due`, `difficulty-balance`
- `locked`: boolean for user-pinned assignments
- `createdAt`
- `updatedAt`

### `RoadmapEvent`

- `id`
- `roadmapId`
- `type`: `created`, `rebalanced`, `paused`, `resumed`, `item_completed`, `item_moved`, `sync_matched`
- `payload`: JSON
- `createdAt`

Use events for auditability and future AI explanations. Do not overbuild a workflow engine in the first version.

## Generation Algorithm

Inputs:

- User solved state from `UserQuestion`.
- Company frequency from `CompanyQuestion`.
- Topics from `Question.topics`.
- Review due state from `ReviewItem`.
- Difficulty distribution.
- Deadline and capacity.

Selection order:

1. Exclude already solved questions unless the strategy explicitly includes review.
2. Match goal filters.
3. Rank by:
   - Company frequency if company roadmap.
   - Weak topics and low confidence if repair roadmap.
   - Topic coverage if topic roadmap.
   - Readiness gap if interview sprint.
4. Balance difficulty:
   - Warmup with easy/medium.
   - Keep hard problems away from overloaded days.
   - Avoid two very hard days back to back unless deadline forces it.
5. Fill daily buckets by capacity.
6. Add review reminders on lighter days.

The generator should be deterministic for the same input unless the user asks for variety.

## Rebalancing

Rebalance triggers:

- User clicks "Rebalance".
- Sync marks planned questions as already solved.
- User skips a day.
- Deadline changes.
- Capacity changes.

Rules:

- Never move locked items.
- Preserve completed items.
- Move missed planned items forward.
- Avoid increasing today's load unless user confirms.
- Explain changes in human terms: "Moved 3 unsolved graph questions into the next two study days."

## UI Design

Use a native app layout:

- Left pane: roadmap list, status, progress, deadline.
- Center pane: calendar timeline.
- Right inspector: selected roadmap, day, or question.

### Roadmap List Row

Show:

- Name.
- Progress ring or slim bar.
- Deadline.
- Status badge.
- Today's count.

### Timeline

Each day cell shows:

- Date.
- Count.
- Difficulty chips.
- Completion state.
- Tiny markers for reviews or locked items.

Clicking a day opens the inspector with exact questions.

### Question Assignment Row

Show:

- Solved checkbox.
- Question title.
- Difficulty.
- Topics.
- Reason.
- LeetCode link.
- Drag handle or move button.

Rows must have stable height. No expanding row should shift the whole timeline aggressively.

## Services and Libraries Worth Considering

- Use existing Prisma/PostgreSQL first. A roadmap generator does not need an external planning service.
- Consider [Trigger.dev](https://trigger.dev/docs) later for long-running roadmap generation, sync jobs, reports, and reminder workflows. Trigger.dev documents background jobs with queuing, retries, monitoring, scheduled tasks, and real-time frontend status.
- Consider [Inngest](https://www.inngest.com/docs/learn/how-functions-are-executed) if the project wants durable functions that persist state across retries and resumptions.
- Consider [PostHog](https://github.com/PostHog/posthog) only after the UI cleanup, for feature flags and session replay while testing major navigation changes.

## MVP Scope

Must have:

- Create multiple roadmaps.
- Generate exact daily question assignments.
- Show active roadmap on Today.
- Mark roadmap items complete when the underlying question is solved.
- Manual move/skip/lock.
- Rebalance.

Should have:

- Duplicate roadmap.
- Archive roadmap.
- Readiness delta.
- Import existing `StudyPlan` as weekly roadmap.

Defer:

- AI-generated motivational copy.
- Voice coach integration.
- Calendar export.
- Collaborative roadmaps.
- Browser automation.

## Acceptance Criteria

- User can create a "company by deadline" roadmap in under one minute.
- Roadmap shows exactly what to solve each day.
- Multiple active and paused roadmaps are supported.
- Solving a question updates roadmap progress automatically.
- Sync from LeetCode updates roadmap progress automatically.
- Rebalancing does not lose completed/manual choices.
- Wiki documents new models, actions, pages, and migration from `StudyPlan`.
