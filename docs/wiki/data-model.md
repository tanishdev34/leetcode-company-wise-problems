# Data Model

> **See also:** [[actions]] | [[components]] | [[configuration]]

## Entity Relationship Diagram

```
User ──< UserQuestion >── Question ──< CompanyQuestion >── Company
                                        (join table)
```

Each relation:
- [[actions#toggleSolved|toggleSolved]] creates/updates `UserQuestion`
- [[actions#getCompanyQuestions|getCompanyQuestions]] queries `CompanyQuestion` + `UserQuestion`
- [[actions#getQuestionDetail|getQuestionDetail]] joins through `CompanyQuestion` → `Company`
- [[actions#getDashboardStats|getDashboardStats]] aggregates across `UserQuestion` + `Question`

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

Relations: `sessions`, `accounts`, `userQuestions`
Used in: [[actions#toggleSolved]], [[components#auth]] forms, [[pages#dashboard-dashboard]]

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

Relations: `userQuestions`, `companyQuestions`
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

Worker: `lib/analyze.ts` `processAnalysisJob(jobId)` — runs Cerebras + merges into [[#userquestion-user-progress]]; retries with exponential backoff (2s, 8s, 30s).

Lifecycle: created by `POST /api/analyze`, scheduled via `next/server` `after()`, polled by client via `GET /api/analyze`.

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
