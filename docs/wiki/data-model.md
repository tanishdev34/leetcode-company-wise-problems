# Data Model

> **See also:** [[actions]] | [[components]] | [[configuration]]

## Entity Relationship Diagram

```
User ──< UserQuestion >── Question ──< CompanyQuestion >── Company
                                        (join table)
User ──< StudyPlan >── StudyPlanItem >── Question
User ──< ReviewItem >── Question
User ──< InterviewSession >── Question
User ──< Roadmap >── RoadmapItem >── Question
User ──< SyncRun
```

Each relation:
- [[actions#toggleSolved|toggleSolved]] creates/updates `UserQuestion`
- [[actions#getCompanyQuestions|getCompanyQuestions]] queries `CompanyQuestion` + `UserQuestion`
- [[actions#getQuestionDetail|getQuestionDetail]] joins through `CompanyQuestion` → `Company`
- [[actions#getDashboardStats|getDashboardStats]] aggregates across `UserQuestion` + `Question`
- [[actions#studyplanner|study-planner]] manages `StudyPlan` + `StudyPlanItem`
- [[actions#reviewts|review]] manages `ReviewItem` (spaced repetition)
- [[actions#readinessts|readiness]] computes per-company readiness scores (derived)

## Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `email` | String | Unique |
| `name` | String? | Display name |
| `passwordHash` | String? | For email/password auth |
| `image` | String? | Avatar URL |
| `role` | String | `"user"` or `"admin"` — checked by [[actions#post-apianalyze]] |
| `leetcodeUsername` | String? | Linked LeetCode handle — set via [[actions#profilets]] `saveLeetcodeUsername` |
| `codeforcesUsername` | String? | Linked Codeforces handle — set via [[actions#codeforcests]] `saveCodeforcesUsername` |
| `emailSubscribed` | Boolean | Default `false` — toggled via [[actions#emailts]] `toggleEmailSubscription`, used by [[actions#daily-question-cron]] and [[actions#contest-reminder-cron]] |
| `emailVerified` | Boolean | Default `false` |

Relations: `sessions`, `accounts`, `userQuestions`, `solutionReviews`, `studyPlans`, `reviewItems`, `interviewSessions`
Used in: [[actions#toggleSolved]], [[actions#studyplanner]], [[actions#reviewts]], [[actions#solution-review-actions]], [[components#auth]] forms, [[pages#dashboard-dashboard]]

### Session
Better Auth session model. Linked to `User` via `userId`. Checked by [[actions]] auth guard pattern.

### Account
Better Auth account model for OAuth providers. Unique on `(providerId, accountId)`.

### Company
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `name` | String | Unique, e.g. `"Google"` |
| `slug` | String | Unique, e.g. `"google"` |

Relations: `companyQuestions`
Index: `slug`
Used in: [[pages#companies-list-companies]], [[pages#company-detail-companiesslug]], [[components#company]]

### Question
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `title` | String | Question title — searched via [[configuration#search-index]] pg_trgm |
| `leetcodeUrl` | String | Unique |
| `difficulty` | Difficulty enum | `EASY`, `MEDIUM`, `HARD` — rendered by [[components#questions]] `DifficultyBadge` |
| `topics` | String[] | PostgreSQL array — shown as tags in [[components#questions]] `QuestionRow` |
| `acceptanceRate` | Float | 0.0 to 1.0 |
| `createdAt` | DateTime | Auto-set |

Relations: `userQuestions`, `companyQuestions`, `solutionReviews`, `studyPlanItems`, `reviewItems`, `interviewSessions`
Index: `difficulty`
Used in: [[components#question-table]], [[components#question-row]], [[actions#getQuestionDetail]]

### CompanyQuestion (join table)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `questionId` | String | FK → Question |
| `companyId` | String | FK → Company |
| `timePeriod` | TimePeriod enum | See below — filtered by [[components#company]] `TimePeriodTabs` |
| `frequency` | Float | 0.0–100.0, how often asked — used for sorting in [[actions#getCompanyQuestions-sorting-logic]] |

Unique: `(questionId, companyId, timePeriod)`
Indexes: `questionId`, `companyId`

**TimePeriod enum:**
- `THIRTY_DAYS` — asked in last 30 days
- `THREE_MONTHS` — asked in last 3 months
- `SIX_MONTHS` — asked in last 6 months
- `MORE_THAN_SIX_MONTHS` — asked 6+ months ago
- `ALL` — all-time frequency/association

**Key insight:** A question can appear multiple times for the same company with different `timePeriod` values, each having its own `frequency`. The `TimePeriodTabs` component (see [[components#company]]) switches between these.

### UserQuestion (user progress)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `questionId` | String | FK → Question |
| `solved` | Boolean | Default `false` — toggled via [[actions#toggleSolved]] |
| `solvedAt` | DateTime? | When solved — used for sorting in [[actions#getCompanyQuestions-sorting-logic]] |
| `notes` | String? | Markdown notes (max 10k chars) — edited via [[components#questions]] `NoteEditor` |
| `code` | String? | Solution code (max 50k chars) — analyzed via [[actions#post-apianalyze]] |
| `language` | String | Default `"cpp"` |
| `hints` | String? | AI-generated hints — written by the worker behind [[actions#post-apianalyze]] |

Unique: `(userId, questionId)`
Indexes: `userId`, `questionId`

### AnalysisJob (AI analysis queue)
Tracks background AI analysis runs so the work survives the user closing the page.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key (also the polling key) |
| `userId` | String | FK → User (cascade delete) |
| `questionId` | String | FK → Question (cascade delete) |
| `status` | String | `"pending" \| "running" \| "done" \| "error"` (default `"pending"`) |
| `language` | String | Snapshot of language at submission time |
| `code` | String | Snapshot of code at submission time |
| `error` | String? | Last error message if a retry failed |
| `attempts` | Int | Number of attempts so far (default 0) |
| `maxAttempts` | Int | Max retry attempts (default 3) |
| `createdAt` | DateTime | — |
| `updatedAt` | DateTime | — |

Indexes: `(userId, questionId, status)`, `(userId, questionId, createdAt)`

Worker: `lib/analyze.ts` `processAnalysisJob(jobId)` — runs Crof AI (shared `@ai-sdk/anthropic` client in `lib/ai.ts`) + merges into [[#userquestion-user-progress]]; retries with exponential backoff (2s, 8s, 30s).

Lifecycle: created by `POST /api/analyze`, scheduled via `next/server` `after()`, polled by client via `GET /api/analyze`.

### StudyPlan
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User (cascade delete) |
| `name` | String | Plan name (e.g., "Week 1 - Arrays") |
| `weekStart` | DateTime | Monday of the plan week |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-set |

Relations: `user`, `items` (StudyPlanItem[])
Index: `userId`
Created by: [[actions#studyplanner]] `createStudyPlan()`

### StudyPlanItem
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `planId` | String | FK → StudyPlan (cascade delete) |
| `questionId` | String | FK → Question |
| `dayOfWeek` | Int | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `status` | String | `"planned" \| "in_progress" \| "completed"` (default `"planned"`) |
| `notes` | String? | Optional notes |
| `sortOrder` | Int | Display order within day (default 0) |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-set |

Relations: `plan` (StudyPlan), `question` (Question)
Indexes: `planId`, `questionId`
Managed by: [[actions#studyplanner]] `addPlanItem()`, `updatePlanItemStatus()`, `removePlanItem()`

### ReviewItem
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User (cascade delete) |
| `questionId` | String | FK → Question |
| `confidence` | Int | 1 (forgot) to 5 (mastered) — default 3 |
| `reviewCount` | Int | How many times reviewed (default 0) |
| `lastReviewedAt` | DateTime? | When last reviewed |
| `nextReviewAt` | DateTime | When next review is due |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-set |

Unique: `(userId, questionId)`
Index: `(userId, nextReviewAt)`

**Review intervals by confidence:**
| Confidence | Label | Next Review |
|------------|-------|-------------|
| 1 | Forgot | 1 day |
| 2 | Struggled | 2 days |
| 3 | Moderate | 4 days |
| 4 | Good | 7 days |
| 5 | Mastered | 14 days |

Auto-created when a question is solved via [[actions#toggleSolved]]. Managed by [[actions#reviewts]].

### SolutionReview (AI Interview Coach queue)
Tracks background AI solution review runs, providing interview-style feedback on saved code.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key (also the polling key) |
| `userId` | String | FK → User (cascade delete) |
| `questionId` | String | FK → Question (cascade delete) |
| `code` | String | Snapshot of code at submission time |
| `language` | String | Default `"cpp"` |
| `status` | String | `"pending" \| "running" \| "done" \| "error"` (default `"pending"`) |
| `error` | String? | Last error message if a retry failed |
| `correctness` | String? | `"correct" \| "partially_correct" \| "incorrect"` |
| `timeComplexity` | String? | Big O time complexity with reasoning |
| `spaceComplexity` | String? | Big O space complexity with reasoning |
| `edgeCases` | String? | JSON array of edge cases |
| `explanation` | String? | Explanation quality feedback |
| `followUps` | String? | JSON array of follow-up questions |
| `suggestions` | String? | Improvement suggestions |
| `attempts` | Int | Number of attempts so far (default 0) |
| `maxAttempts` | Int | Max retry attempts (default 3) |
| `createdAt` | DateTime | — |
| `updatedAt` | DateTime | — |

Index: `(userId, questionId)`

Worker: `lib/solution-review.ts` `processSolutionReview(jobId)` — runs Crof AI (shared `@ai-sdk/anthropic` client in `lib/ai.ts`) with structured output (correctness, complexity, edge cases, explanation, follow-ups, suggestions); retries with exponential backoff (2s, 8s, 30s).

Lifecycle: created by `POST /api/solution-review`, scheduled via `next/server` `after()`, polled by client via `GET /api/solution-review`.

### InterviewSession (Mock Interview Room)
Tracks solo mock interview sessions with timed, randomly-selected questions.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User (cascade delete) |
| `questionId` | String | FK → Question (cascade delete) |
| `startedAt` | DateTime | Auto-set to `now()` on creation |
| `endedAt` | DateTime? | Set when completed or cancelled |
| `duration` | Int? | Duration in seconds (set from user's choice at start) |
| `status` | String | `"in_progress" \| "completed" \| "cancelled"` (default `"in_progress"`) |
| `rating` | Int? | 1-5 self-rating submitted after completion |
| `notes` | String? | Scratch notes taken during the interview |
| `reflection` | String? | Post-interview reflection text |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-set |

Index: `(userId, status)`

Lifecycle:
1. Created by [[actions#actionsinterviewts]] `startInterview()` with `status: "in_progress"`
2. Updated by `completeInterview()` (sets `status: "completed"`, `endedAt`, `rating`, `notes`, `reflection`)
3. Updated by `cancelInterview()` (sets `status: "cancelled"`, `endedAt`)
4. Read by `getInterviewHistory()` (ordered by `startedAt` desc, max 50)

### Roadmap
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `name` | String | Roadmap name |
| `status` | String | `active`, `paused`, `completed`, `archived` |
| `goalType` | String | `company`, `topic`, `mixed`, `custom` |
| `companyId` | String? | FK → Company (if company goal) |
| `topicSlug` | String? | Topic slug (if topic goal) |
| `startDate` | DateTime | Start date |
| `endDate` | DateTime | Deadline |
| `dailyQuestionTarget` | Int | Questions per study day (default 3) |
| `studyDays` | Int[] | Days of week 0-6 (default Mon-Fri) |
| `strategy` | String | `balanced`, `frequency`, `weak_topic`, `sprint` |

Relations: `user`, `company`, `items`, `events`
Created by: [[actions#roadmaps]] `createRoadmap()`

### RoadmapItem
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `roadmapId` | String | FK → Roadmap |
| `questionId` | String | FK → Question |
| `plannedDate` | DateTime | Assigned study date |
| `sortOrder` | Int | Order within day |
| `status` | String | `planned`, `in_progress`, `completed`, `skipped`, `moved` |
| `sourceReason` | String? | Why assigned: `company-frequency`, `weak-topic`, etc. |
| `locked` | Boolean | User-pinned (rebalance won't move) |

Managed by: [[actions#roadmaps]] `completeRoadmapItem()`, `moveRoadmapItem()`, `rebalanceRoadmap()`

### RoadmapEvent
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `roadmapId` | String | FK → Roadmap |
| `type` | String | `created`, `rebalanced`, `paused`, `resumed`, `item_completed`, `item_moved`, `sync_matched` |
| `payload` | Json? | Event data |
| `createdAt` | DateTime | Auto-set |

### SyncRun
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `provider` | String | `leetcode` |
| `status` | String | `pending`, `running`, `done`, `error` |
| `startedAt` | DateTime | Auto-set |
| `finishedAt` | DateTime? | When completed |
| `matchedCount` | Int | Questions matched |
| `importedCount` | Int | New questions imported |
| `skippedCount` | Int | Questions skipped (paid-only, etc.) |
| `error` | String? | Error message |
| `metadata` | Json? | Additional data |

Used by: [[actions#sync]] `POST /api/sync`

### Question (updated)
Added `titleSlug` field — stable slug for direct LeetCode GraphQL lookups. Unique. Backfilled from `leetcodeUrl`.

### Verification
Better Auth verification model (email verification). See [[configuration#better-auth]].

## Enums

```prisma
enum Difficulty { EASY, MEDIUM, HARD }    // Used by: [[components#questions]] DifficultyBadge
enum TimePeriod { THIRTY_DAYS, THREE_MONTHS, SIX_MONTHS, MORE_THAN_SIX_MONTHS, ALL }  // Used by: [[components#company]] TimePeriodTabs
```

## Key Queries

### `getCompanyQuestions()` — See [[actions#getCompanyQuestions-sorting-logic]] for full algorithm
1. Fetch all `CompanyQuestion` IDs + frequencies for `(companyId, timePeriod)`
2. Fetch user's `UserQuestion` where `solved: true` for those IDs
3. Sort: solved first (by `solvedAt` desc), then unsolved (by `frequency` desc)
4. Paginate, then fetch full question details for current page

### `toggleSolved()` — See [[actions#toggleSolved]]
- If `UserQuestion` exists: toggle `solved`, update `solvedAt` (now if becoming solved, null if unsolved)
- If not: create with `solved: true`, `solvedAt: now()`

### `getDashboardStats()` — See [[actions#actionsstatsts]]
- Counts solved `UserQuestion` records
- Groups by `Question.difficulty` for breakdown
- Joins through `Company` for per-company progress
- Orders by `solvedAt` desc for recent activity

### Seed Script — See `prisma/seed.ts`
- Reads CSV files from company directories
- Upserts `Company`, `Question`, and `CompanyQuestion` records
- Maps file names to `TimePeriod` enum values
