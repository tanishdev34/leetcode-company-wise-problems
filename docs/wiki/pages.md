# Pages & Routes

> **See also:** [[components]] | [[actions]] | [[configuration]]

## Route Map

### Auth Group `(auth)/`

| Route | File | Auth | Components Used | Actions Called |
|-------|------|------|-----------------|----------------|
| `/login` | `app/(auth)/login/page.tsx` | Public | [[components#auth]] `LoginForm` | — |
| `/register` | `app/(auth)/register/page.tsx` | Public | [[components#auth]] `RegisterForm` | — |

### Main Group `(main)/`

| Route | File | Auth | Components Used | Actions Called |
|-------|------|------|-----------------|----------------|
| `/` | `app/(main)/page.tsx` | Public (SSR) | [[components#search]] `SearchBar`, [[components#company]] `CompanyCard`, [[components#questions]] `DifficultyBadge` | Direct Prisma (no action) |
| `/companies` | `app/(main)/companies/page.tsx` | Public (SSR) | [[components#company]] `CompanyCard`, `CompaniesFilter` | Direct Prisma (no action) |
| `/companies/[slug]` | `app/(main)/companies/[slug]/page.tsx` | Public (CSR) | [[components#company]] `TimePeriodTabs`, [[components#question-table]] `QuestionTable` | [[actions#getCompanyQuestions]] |
| `/search` | `app/(main)/search/page.tsx` | Public (CSR) | [[components#search]] `SearchBar`, [[components#search]] `SearchResults` | [[actions#get-apisearchqpage1pagesize20]] via fetch |
| `/questions/[id]` | `app/(main)/questions/[id]/page.tsx` | Public (CSR) | [[components#questions]] `NoteEditor`, `DifficultyBadge`, checkbox | [[actions#getQuestionDetail]], [[actions#getNotes]], [[actions#toggleSolved]] |
| `/dashboard` | `app/(main)/dashboard/page.tsx` | **Auth required** | [[components#dashboard]] `StatsOverview`, `CompanyProgress`, `LeetCodeStats` (which renders `RecentSolvedList`), `SubmissionHeatmap`, `SkillBars`, `ContestStats`, `SolvedProgress`, `DailyProblemCard`, `LeetCodeUsernameForm` | [[actions#getDashboardStats]], [[actions#profilets]] |
| `/admin/questions` | `app/(main)/admin/questions/page.tsx` | **Auth required** | [[components#admin]] `AdminQuestionsForm` | [[actions#admints]] |

### API Routes

| Route | File | Auth | Called By | Description |
|-------|------|------|-----------|-------------|
| `GET /api/search?q=&page=` | `app/api/search/route.ts` | Public | [[components#search]] `SearchBar` → [[pages#search-search]] | pg_trgm fuzzy search |
| `POST /api/sync` | `app/api/sync/route.ts` | **Auth required** | [[components#dashboard]] `LeetCodeUsernameForm` | Sync LeetCode submissions |
| `GET /api/leetcode/stats?username=` | `app/api/leetcode/stats/route.ts` | Public | [[components#dashboard]] `LeetCodeStats` | LeetCode user stats (Redis cached) |
| `GET /api/leetcode/calendar?username=` | `app/api/leetcode/calendar/route.ts` | Public | [[components#dashboard]] `SubmissionHeatmap` | LeetCode calendar (Redis cached) |
| `GET /api/leetcode/daily` | `app/api/leetcode/daily/route.ts` | Public | [[components#dashboard]] `DailyProblemCard` | Daily LeetCode problem |
| `GET /api/leetcode/submissions` | `app/api/leetcode/submissions/route.ts` | Public | — | LeetCode submissions |
| `GET /api/cron/daily-question` | `app/api/cron/daily-question/route.ts` | Cron secret | [[actions#daily-question-cron]] | Send daily LeetCode question emails |
| `GET /api/cron/contest-reminder` | `app/api/cron/contest-reminder/route.ts` | Cron secret | [[actions#contest-reminder-cron]] | Send contest reminder emails |
| `GET/POST /api/auth/[...all]` | `app/api/auth/[...all]/route.ts` | — | [[components#auth]] `LoginForm`, `RegisterForm` | Better Auth handler |

## URL Parameter Details

### `/companies/[slug]`
| Param | Type | Default | Used By | Description |
|-------|------|---------|---------|-------------|
| `period` | `TimePeriod` string | `"ALL"` | [[components#company]] `TimePeriodTabs` | Time period filter — see [[data-model#timeperiod-enum]] |
| `page` | number | `1` | [[components#question-table]] | Page number (50 per page) |

### `/search`
| Param | Type | Default | Used By | Description |
|-------|------|---------|---------|-------------|
| `q` | string | — | [[actions#get-apisearchqpage1pagesize20]] | Search query (min 2 chars) |
| `page` | number | `1` | [[components#search]] `SearchResults` | Page number (20 per page) |

### `/questions/[id]`
| Param | Type | Default | Used By | Description |
|-------|------|---------|---------|-------------|
| `id` | string (cuid) | — | [[actions#getQuestionDetail]] | Question ID |

## Route Protection

- **Middleware** (`middleware.ts`) protects `/dashboard` by checking for Better Auth session cookie. See [[configuration#config-files]].
- **Server components** (e.g., dashboard page) call `auth.api.getSession()` server-side and redirect if not authenticated.
- **Server actions** call `auth.api.getSession()` and return `{ success: false, error: "Not authenticated" }`. See [[conventions#server-action-pattern]].
- **Public routes** work without auth; solved status/notes are simply not shown.

## Page Behavior

### Landing Page `/`
- SSR: fetches top 12 companies (by question count), total counts, last 10 questions via direct Prisma queries.
- Components: [[components#search]] `SearchBar`, stats cards, [[components#company]] `CompanyCard` grid, recently added list.

### Companies List `/companies`
- SSR: fetches all companies with question counts.
- Client-side filter by name (case-insensitive substring match) via `CompaniesFilter`.
- Links to [[pages#company-detail-companiesslug]].

### Company Detail `/companies/[slug]`
- CSR: fetches questions via [[actions#getCompanyQuestions]] server action.
- Shows [[components#company]] `TimePeriodTabs` (5 tabs) and paginated [[components#question-table]] `QuestionTable`.
- URL search params for bookmarkable state (period + page).
- **Sorting:** solved questions first (by `solvedAt` desc), then unsolved (by `frequency` desc). See [[actions#getCompanyQuestions-sorting-logic]].

### Dashboard `/dashboard`
- SSR with auth check: fetches stats via [[actions#getDashboardStats]].
- Multiple dashboard components: [[components#dashboard]] `StatsOverview`, `CompanyProgress`, `LeetCodeStats` (which renders `RecentSolvedList` — single merged "Recently Solved" view that links to local `/questions/{id}` when the slug exists in the user's question set), `SubmissionHeatmap`, `SkillBars`, `ContestStats`, `SolvedProgress`, `DailyProblemCard`.
- The dashboard server component computes a `slugToQuestionId` map from the user's `Question` rows (slug parsed from `leetcodeUrl`) and passes it through `LeetCodeStats` → `RecentSolvedList` so live LeetCode submissions can deep-link to local question pages.
- `LeetCodeUsernameForm` for linking LeetCode profile (triggers [[actions#sync]] via POST `/api/sync`).

### Search `/search`
- CSR with debounced search input (300ms).
- Calls [[actions#get-apisearchqpage1pagesize20]] API endpoint.
- Results rendered by [[components#search]] `SearchResults`.
- Pagination via `page` URL param.

### Admin `/admin/questions`
- **Admin role required** — checks `session.user.role === "admin"`.
- [[components#admin]] `AdminQuestionsForm`: single question import by LeetCode URL, CSV file upload.
- Calls [[actions#admints]] `importQuestion()` and `bulkImportCSV()`.
