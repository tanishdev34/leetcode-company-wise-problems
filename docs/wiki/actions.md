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
| `toggleSolved(questionId)` | Yes | `questionId: string` | `{ solved: boolean, solvedAt: Date \| null }` | [[components#questions]] `QuestionRow` checkbox, [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]] |
| `saveNotes(questionId, markdown)` | Yes | `questionId, markdown (max 10k chars)` | `{ success: true }` | [[components#questions]] `NoteEditor` | Yes — [[data-model#userquestion-user-progress]] |
| `saveCode(questionId, code, language?)` | Yes | `questionId, code (max 50k chars), language?` | `{ success: true }` | [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]] |
| `saveHints(questionId, hints)` | Yes | `questionId, hints (max 10k chars)` | `{ success: true }` | [[pages]] `/questions/[id]` | Yes — [[data-model#userquestion-user-progress]] |
| `getNotes(questionId)` | Yes | `questionId` | `{ notes, code, language, hints }` | [[components#questions]] `QuestionDetail` | No |

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

### `actions/email.ts` — [[data-model#user]]

| Action | Auth | Params | Returns | Called By | Mutates |
|--------|------|--------|---------|-----------|---------|
| `getEmailSubscription()` | Yes | — | `{ subscribed: boolean }` | [[components#dashboard]] `EmailSubscriptionToggle` | No |
| `toggleEmailSubscription()` | Yes | — | `{ subscribed: boolean }` | [[components#dashboard]] `EmailSubscriptionToggle` | Yes — toggles [[data-model#user]] `emailSubscribed` |

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
- Fetches LeetCode GraphQL API → upserts [[data-model#userquestion-user-progress]] records
- Called by: [[components#dashboard]] `LeetCodeUsernameForm`

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

### `POST /api/analyze`
Enqueues an AI analysis job (admin only) and returns immediately.
- Auth required, admin only
- Body: `{ questionId: string, code: string, language: string }`
- Creates an [[data-model#analysisjob-ai-analysis-queue]] row with `status: "pending"`, schedules `processAnalysisJob(jobId)` via `next/server`'s `after()`, returns `{ jobId, status }`.
- If a `pending`/`running` job already exists for `(userId, questionId)`, returns the existing `jobId` instead of creating a new one.
- The background worker (`lib/analyze.ts`) calls Cerebras, merges output into [[data-model#userquestion-user-progress]] `notes`/`hints`, and retries with exponential backoff (2s, 8s, 30s) up to `maxAttempts` (default 3) on failure.
- Called by: [[components#questions]] `NoteEditor` Generate button.

### `GET /api/analyze?questionId=`
Returns the latest analysis job for the current user + question.
- Auth required
- Returns: `{ job: { id, status, attempts, maxAttempts, error, updatedAt } | null }`
- Called by: [[components#questions]] `NoteEditor` (on mount + while polling).

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
