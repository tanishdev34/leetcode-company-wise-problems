# Server Actions & API

> **See also:** [[data-model]] | [[pages]] | [[components]]

## Server Actions (`actions/`)

All server actions return `ActionResult<T>`:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```
See [[conventions#server-action-pattern]] for the standard implementation template.

### `actions/questions.ts` — [[data-model#question]], [[data-model#userquestion-user-progress]], [[data-model#companyquestion-join-table]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getCompanies()` | No | — | `{ companies[], totalQuestions, totalCompanies }` | [[pages#companies-list-companies]] | No |
| `getCompanyQuestions(slug, timePeriod, page, pageSize)` | No | `slug: string, timePeriod: TimePeriod, page: number, pageSize?: number` | `{ questions[], totalPages, currentPage }` | [[pages#company-detail-companiesslug]] | No |
| `getQuestionDetail(questionId)` | No | `questionId: string` | `{ id, title, leetcodeUrl, difficulty, topics, frequency, acceptanceRate, companies[], solved, solvedAt, notes, code, language, hints }` | [[pages]] `/questions/[id]` | No |
| `toggleSolved(questionId)` | Yes | `questionId: string` | `{ solved: boolean, solvedAt: Date \| null }` | [[components#questions]] `QuestionRow` checkbox, [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]]. Auto-schedules a [[data-model#reviewitem]] via [[actions#reviewts]] `autoScheduleAfterSolve()` when becoming solved. |
| `saveNotes(questionId, markdown)` | Yes | `questionId, markdown (max 10k chars)` | `{ success: true }` | [[components#questions]] `NoteEditor` | Yes — [[data-model#userquestion-user-progress]] |
| `saveCode(questionId, code, language?)` | Yes | `questionId, code (max 50k chars), language?` | `{ success: true }` | [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]] |
| `saveHints(questionId, hints)` | Yes | `questionId, hints (max 10k chars)` | `{ success: true }` | [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]] |
| `getNotes(questionId)` | Yes | `questionId` | `{ notes, code, language, hints }` | [[components#questions]] `QuestionDetail` | No |
| `enqueueSolutionReview(questionId)` | Yes | `questionId: string` | `{ jobId, status }` | [[components#aiinterviewcoach]] `AiInterviewCoach` | Yes — creates [[data-model#solutionreview]] |

### `actions/stats.ts` — [[data-model#userquestion-user-progress]], [[data-model#question]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getDashboardStats()` | Yes | — | `{ totalSolved, byDifficulty, byCompany[], recentActivity[] }` | [[pages#dashboard-dashboard]] | No |

### `actions/admin.ts` — [[data-model#company]], [[data-model#question]], [[data-model#companyquestion-join-table]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `importQuestion(leetcodeUrl)` | **Admin** | `leetcodeUrl: string` | `{ success: true }` | [[pages#admin-adminquestions]] | Yes — creates [[data-model#question]] + [[data-model#companyquestion-join-table]] |
| `bulkImportCSV(formData)` | **Admin** | `formData: FormData` | `{ imported, skipped }` counts | [[pages#admin-adminquestions]] | Yes — bulk upserts |

### `actions/profile.ts` — [[data-model#user]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `saveLeetcodeUsername(username)` | Yes | `username: string` | `{ success: true }` | [[components#dashboard]] `LeetCodeUsernameForm` | Yes — updates [[data-model#user]] |

### `actions/codeforces.ts` — [[data-model#user]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `saveCodeforcesUsername(username)` | Yes | `username: string` | `{ success: true }` | [[components#codeforces]] `CodeforcesUsernameForm` on [[pages#dashboard-dashboard]] and [[pages#codeforces-codeforces]] | Yes — updates [[data-model#user]] `codeforcesUsername` |

### `actions/study-planner.ts` — [[data-model#studyplan]], [[data-model#studyplanitem]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `createStudyPlan(name, weekStart)` | Yes | `name: string, weekStart: ISO date` | `{ id, name, weekStart }` | [[components#studyplanner]] | Yes — creates [[data-model#studyplan]] |
| `getStudyPlans()` | Yes | — | `{ plans: [{ id, name, weekStart, itemCount, completedCount, createdAt }] }` | [[components#studyplanner]] | No |
| `getStudyPlanDetail(planId)` | Yes | `planId: string` | `{ id, name, weekStart, items[] }` | [[components#studyplanner]] | No |
| `addPlanItem(planId, questionId, dayOfWeek)` | Yes | `planId, questionId, dayOfWeek: 0-6` | `{ id }` | [[components#studyplanner]] | Yes — creates [[data-model#studyplanitem]] |
| `updatePlanItemStatus(itemId, status)` | Yes | `itemId, status: string` | `{ success: true }` | [[components#studyplanner]] | Yes — updates [[data-model#studyplanitem]] |
| `removePlanItem(itemId)` | Yes | `itemId: string` | `{ success: true }` | [[components#studyplanner]] | Yes — deletes [[data-model#studyplanitem]] |
| `deleteStudyPlan(planId)` | Yes | `planId: string` | `{ success: true }` | [[components#studyplanner]] | Yes — deletes [[data-model#studyplan]] |
| `searchQuestionsForPlan(query)` | Yes | `query: string` | `{ questions: [{ id, title, difficulty, leetcodeUrl }] }` | [[components#studyplanner]] | No |

### `actions/review.ts` — [[data-model#reviewitem]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `scheduleReview(questionId, confidence)` | Yes | `questionId, confidence: 1-5` | `{ nextReviewAt }` | [[components#reviewqueue]], [[actions#toggleSolved]] | Yes — creates/updates [[data-model#reviewitem]] |
| `getDueReviews()` | Yes | — | `{ items: [{ id, questionId, questionTitle, leetcodeUrl, difficulty, confidence, reviewCount, lastReviewedAt, nextReviewAt }] }` | [[components#reviewqueue]] | No |
| `getReviewStats()` | Yes | — | `{ dueCount, totalCount, nextReview }` | [[components#reviewqueue]] | No |
| `autoScheduleAfterSolve(questionId)` | Yes | `questionId: string` | `{ nextReviewAt }` | [[actions#toggleSolved]] | Yes — auto-schedules with confidence 3 |

### `actions/readiness.ts` — Derived-only (no new models)

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getReadinessScores()` | Yes | — | `{ companies[], overallScore, totalSolved, totalQuestions }` | [[components#readinessscores]] | No |

### `actions/learning-graph.ts` — Derived-only (no new models)

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getLearningGraph()` | Yes | — | `{ nodes[], edges[], insights }` from `lib/learning-graph.ts` | [[components#learning-graph]] `LearningGraphView` | No |

### `actions/study-report.ts` — Derived-only (no new models)

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getWeeklyStudyReport()` | Yes | — | Weekly report from `lib/study-report.ts`: metrics, highlights, recommendations, company focus, topic focus | [[components#study-reports]] `StudyReportView` | No |

### `actions/mistake-memory.ts` — Derived-only (no new models)

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getMistakeMemory()` | Yes | — | Mistake patterns and recommendations from `lib/mistake-memory.ts` | [[components#mistake-memory]] `MistakeMemoryView` | No |

### `actions/system-map.ts` — Admin source scanner

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getSystemMap()` | **Admin** | — | `{ nodes[], edges[], summary }` from `lib/system-map.ts` | [[components#system-map]] `SystemMapView` | No |

### `actions/interview.ts` — [[data-model#interviewsession]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `startInterview(questionId, durationMinutes?)` | Yes | `questionId: string, durationMinutes?: number` (default 45) | `{ id, startedAt }` | [[components#interview-room]] `InterviewRoom` | Yes — creates [[data-model#interviewsession]] |
| `completeInterview(id, data)` | Yes | `id: string, data: { rating?, notes?, reflection? }` | `{ success: true }` | [[components#interview-room]] `InterviewRoom` | Yes — updates [[data-model#interviewsession]] |
| `cancelInterview(id)` | Yes | `id: string` | `{ success: true }` | [[components#interview-room]] `InterviewRoom` | Yes — updates [[data-model#interviewsession]] |
| `getInterviewHistory()` | Yes | — | `{ sessions: [...] }` with question details | [[components#interview-room]] `InterviewRoom` | No |
| `getRandomQuestion(difficulty?)` | Yes | `difficulty?: "EASY" \| "MEDIUM" \| "HARD"` | `{ id, title, leetcodeUrl, difficulty, topics }` | [[components#interview-room]] `InterviewRoom` | No |

### `actions/email.ts` — [[data-model#user]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getEmailSubscription()` | Yes | — | `{ subscribed: boolean }` | [[components#dashboard]] `EmailSubscriptionToggle` | No |
| `toggleEmailSubscription()` | Yes | — | `{ subscribed: boolean }` | [[components#dashboard]] `EmailSubscriptionToggle` | Yes — toggles [[data-model#user]] `emailSubscribed` |

### `lib/email.tsx` — React Email rendering + Nodemailer transport

Email templates are built using **React Email** components in `emails/`:
- `emails/daily-question.tsx` — `DailyQuestionEmail` component for daily LeetCode problem emails
- `emails/contest-reminder.tsx` — `ContestReminderEmail` component for contest reminders

The `lib/email.tsx` utility:
- Uses `render()` from `react-email` to convert JSX components to HTML strings
- Uses Nodemailer for SMTP transport (`sendEmail()`)
- Exposes `renderDailyQuestionEmail(question)` and `renderContestReminderEmail(contest)` async functions
- Templates use Tailwind CSS with `pixelBasedPreset` for cross-email-client compatibility
- Dark theme (#0a0a0b / #18181b) matching the app's monospace aesthetic

Called by: [[pages#daily-question-cron]] `GET /api/cron/daily`

## `getCompanyQuestions()` — Sorting Logic

1. Fetch all `CompanyQuestion` IDs + frequencies for `(companyId, timePeriod)` from [[data-model#companyquestion-join-table]]
2. Fetch user's `UserQuestion` where `solved: true` for those IDs (with `solvedAt`) from [[data-model#userquestion-user-progress]]
3. Sort in JavaScript:
   - Solved questions first (by `solvedAt` descending — most recently solved at top)
   - Unsolved questions after (by `frequency` descending)
4. Paginate the sorted list
5. Fetch full question details for the current page's IDs
6. Restore the sorted order

This ensures solved questions always appear first across all pages. Rendered by [[components#question-table]].

## API Routes (`app/api/`)

### `GET /api/search?q=&page=1&pageSize=20`
Fuzzy search using PostgreSQL `pg_trgm` extension (see [[configuration#search-index]]).
- Returns: `{ questions[], totalPages, currentPage }`
- Uses `similarity()` with `%` operator, threshold 0.3
- Ordered by `score DESC, frequency DESC`
- Called by: [[components#search]] `SearchBar` → [[pages#search-search]]

### `POST /api/sync`
Sync LeetCode submissions to local solved status.
- Auth required
- Body: `{ username: string }`
- Fetches `alfa-leetcode-api`'s `acSubmission` for the user, then upserts [[data-model#userquestion-user-progress]] records as `solved: true` for every submission whose `leetcodeUrl` exists in [[data-model#question]].
- **Admin-only auto-import**: when the caller is an admin (`user.role === "admin"`), any submitted slug missing from [[data-model#question]] is fetched from `alfa-leetcode-api`'s `/select?titleSlug=<slug>` endpoint and inserted as a new `Question` (no company link, `acceptanceRate: 0`). The newly imported questions are then marked solved alongside the matched ones. Non-admin users get the original "match-only" behavior.
- Returns: `{ synced, matched, imported }`
- Called by: [[components#dashboard]] `LeetcodeStats` Sync Solved button

### `GET /api/leetcode/stats?username=`
Proxy to LeetCode API. Redis cached (TTL configurable). See [[configuration#environment-variables]].
- Returns: user stats (solved counts, ranking, etc.)
- Called by: [[components#dashboard]] `LeetCodeStats`

### `GET /api/leetcode/calendar?username=`
Proxy to LeetCode API. Redis cached.
- Returns: submission calendar data (heatmap)
- Called by: [[components#dashboard]] `SubmissionHeatmap`

### `GET /api/leetcode/daily`
Fetches daily LeetCode problem.
- Returns: problem details
- Called by: [[components#dashboard]] `DailyProblemCard`

### `GET /api/leetcode/submissions`
Fetches user submissions from LeetCode.
- Returns: recent submissions

### `GET /api/codeforces/user?handle=`
Proxy to Codeforces API `user.info`. Redis cached (CACHE_TTL.STATS).
- Returns: `{ handle, rating, maxRating, rank, maxRank, avatar, titlePhoto, contribution, lastOnlineTimeSeconds, registrationTimeSeconds }`
- Called by: [[components#codeforces]] `CodeforcesProfile`

### `GET /api/codeforces/rating?handle=`
Proxy to Codeforces API `user.rating`. Redis cached (CACHE_TTL.STATS).
- Returns: `{ ratingHistory: [{ contestId, contestName, rank, oldRating, newRating, ratingUpdateTimeSeconds }] }`
- Called by: [[components#codeforces]] `CodeforcesProfile`

### `GET /api/user/profile`
Returns current user's profile data. Auth required.
- Returns: `{ email, leetcodeUsername, codeforcesUsername }`
- Returns 401 if not authenticated.
- Called by: [[extension]] background worker (`GET_USER_PROFILE` handler)

### `POST /api/analyze`
Enqueues an AI analysis job (admin only) and returns immediately.
- Auth required, admin only
- Body: `{ questionId: string, code: string, language: string }`
- Creates an [[data-model#analysisjob-ai-analysis-queue]] row with `status: "pending"`, schedules `processAnalysisJob(jobId)` via `next/server`'s `after()`, returns `{ jobId, status }`.
- If a `pending`/`running` job already exists for `(userId, questionId)`, returns the existing `jobId` instead of creating a new one.
- The background worker (`lib/analyze.ts`) calls Crof AI (shared `@ai-sdk/anthropic` client in `lib/ai.ts`), merges output into [[data-model#userquestion-user-progress]] `notes`/`hints`, and retries with exponential backoff (2s, 8s, 30s) up to `maxAttempts` (default 3) on failure.
- Called by: [[components#questions]] `NoteEditor` Generate button.

### `GET /api/analyze?questionId=`
Returns the latest analysis job for the current user + question.
- Auth required
- Returns: `{ job: { id, status, attempts, maxAttempts, error, updatedAt } | null }`
- Called by: [[components#questions]] `NoteEditor` (on mount + while polling).

### `GET /api/question/overlay?slug=`
Returns overlay summary data for a question by its URL slug.
- Auth: optional — if authenticated, includes personal data (solved status, review info, notes)
- Returns: `{ success, data: { title, difficulty, solved, solvedAt, companies: [{name, frequency}], reviewDue, reviewCount, notes, questionId } }`
- Called by: [[extension]] overlay content script (via background worker `GET_OVERLAY_DATA`)

### `POST /api/solution-review`
Enqueues an AI solution review job and returns immediately.
- Auth required
- Body: `{ questionId: string, code: string, language?: string }`
- Creates a [[data-model#solutionreview]] row with `status: "pending"`, schedules `processSolutionReview(jobId)` via `next/server`'s `after()`, returns `{ jobId, status }`.
- If a `pending`/`running` review already exists for `(userId, questionId)`, returns the existing `jobId` instead of creating a new one.
- The background worker (`lib/solution-review.ts`) calls Crof AI (shared `@ai-sdk/anthropic` client in `lib/ai.ts`) with structured output (correctness, time/space complexity, edge cases, explanation, follow-ups, suggestions) and retries with exponential backoff (2s, 8s, 30s) up to `maxAttempts` (default 3) on failure.
- Called by: [[components#aiinterviewcoach]] `AiInterviewCoach` "Review My Solution" button.

### `GET /api/solution-review?jobId=`
Polls a specific solution review job for the current user.
- Auth required
- Returns: `{ job: { id, status, correctness, timeComplexity, spaceComplexity, edgeCases, explanation, followUps, suggestions, error, code, language, attempts, maxAttempts, createdAt, updatedAt } | null }`
- Called by: [[components#aiinterviewcoach]] `AiInterviewCoach` (polling after enqueue).

### `GET /api/solution-review?questionId=`
Returns the latest solution review job for the current user + question.
- Auth required
- Returns: same as above
- Called by: [[components#aiinterviewcoach]] `AiInterviewCoachWrapper` (on question select).

### `GET /api/question/code?questionId=`
Returns the authenticated user's saved code for a question.
- Auth required
- Returns: `{ code: string, language: string }`
- Called by: [[components#aiinterviewcoach]] `AiInterviewCoachWrapper` (to fetch code for review).

### `POST /api/questions/toggle-solved`
Toggles the solved status of a question for the current user.
- Auth required
- Body: `{ questionId: string }`
- Returns: `{ success, data: { solved, solvedAt } }`
- Called by: [[extension]] overlay content script (via background worker `TOGGLE_SOLVED`)

### `GET|POST /api/auth/[...all]`
Better Auth handler — sessions, login, register, OAuth callbacks. See [[configuration#better-auth]].
- Called by: [[components#auth]] `LoginForm`, `RegisterForm`, `Navbar` sign out

## Error Handling Pattern

All server actions catch errors and return a structured error:
```typescript
// Success
return { success: true, data: { ... } }

// Failure
return { success: false, error: "Human-readable message" }
```
See [[conventions#server-action-pattern]] for the full template.

Client components check `result.success` before accessing `result.data`. See [[conventions#client-component-data-fetching-pattern]].

Auth errors result in `"Not authenticated"` string. API routes use standard HTTP codes (401, 404, 422, 500) with `{ error: string }` body.
