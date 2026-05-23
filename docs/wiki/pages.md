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
| `/dashboard` | `app/(main)/dashboard/page.tsx` | **Auth required** | [[components#dashboard]] `StatsOverview`, `CompanyProgress`, `LeetCodeUsernameForm`, `CodeforcesUsernameForm`, `EmailSubscriptionToggle`, quick links to [[pages#stats-leetcode-stats]] and [[pages#codeforces-codeforces]] | [[actions#getDashboardStats]], [[actions#profilets]], [[actions#codeforcests]] |
| `/stats` | `app/(main)/stats/page.tsx` | **Auth required** | [[components#dashboard]] `LeetcodeUsernameForm`, `LeetcodeStats` (solved progress, contest stats, heatmap, skills, recents) | [[actions#get-leetcode-stats]] API, [[actions#get-leetcode-calendar]] API |
| `/codeforces` | `app/(main)/codeforces/page.tsx` | **Auth required** | [[components#codeforces]] `CodeforcesUsernameForm`, `CodeforcesProfile` (which renders `CodeforcesUserCard`, `RatingHistoryChart`, `ContestHistoryTable`) | [[actions#codeforcests]], [[actions#get-apicodeforcesuserhandle]], [[actions#get-apicodeforcesratinghandle]] |
| `/admin/questions` | `app/(main)/admin/questions/page.tsx` | **Auth required** | [[components#admin]] `AdminQuestionsForm` | [[actions#admints]] |
| `/planner` | `app/(main)/planner/page.tsx` | **Auth required** | [[components#studyplanner]] `StudyPlanner` | [[actions#studyplanner]] |
| `/reviews` | `app/(main)/reviews/page.tsx` | **Auth required** | [[components#reviewqueue]] `ReviewQueue` | [[actions#reviewts]] |
| `/readiness` | `app/(main)/readiness/page.tsx` | **Auth required** | [[components#readinessscores]] `ReadinessScores` | [[actions#readinessts]] |
| `/coach` | `app/(main)/coach/page.tsx` | **Auth required** | [[components#aiinterviewcoach]] `AiInterviewCoachWrapper`, `AiInterviewCoach` | [[actions#solution-review-actions]] via fetch |
| `/interview` | `app/(main)/interview/page.tsx` | **Auth required** | [[components#interview-room]] `InterviewRoom` | [[actions#actionsinterviewts]] `startInterview()`, `completeInterview()`, `cancelInterview()`, `getInterviewHistory()`, `getRandomQuestion()` |

### API Routes

| Route | File | Auth | Called By | Description |
|-------|------|------|-----------|-------------|
| `GET /api/search?q=&page=` | `app/api/search/route.ts` | Public | [[components#search]] `SearchBar` → [[pages#search-search]] | pg_trgm fuzzy search |
| `POST /api/sync` | `app/api/sync/route.ts` | **Auth required** | [[components#dashboard]] `LeetCodeUsernameForm` | Sync LeetCode submissions |
| `GET /api/leetcode/stats?username=` | `app/api/leetcode/stats/route.ts` | Public | [[components#dashboard]] `LeetCodeStats` | LeetCode user stats (Redis cached) |
| `GET /api/leetcode/calendar?username=` | `app/api/leetcode/calendar/route.ts` | Public | [[components#dashboard]] `SubmissionHeatmap` | LeetCode calendar (Redis cached) |
| `GET /api/leetcode/daily` | `app/api/leetcode/daily/route.ts` | Public | [[components#dashboard]] `DailyProblemCard` | Daily LeetCode problem |
| `GET /api/leetcode/submissions` | `app/api/leetcode/submissions/route.ts` | Public | — | LeetCode submissions |
| `GET /api/codeforces/user?handle=` | `app/api/codeforces/user/route.ts` | Public | [[components#codeforces]] `CodeforcesProfile` | Codeforces user info (Redis cached) |
| `GET /api/codeforces/rating?handle=` | `app/api/codeforces/rating/route.ts` | Public | [[components#codeforces]] `CodeforcesProfile` | Codeforces rating history (Redis cached) |
| `GET /api/user/profile` | `app/api/user/profile/route.ts` | **Auth required** | [[extension]] background worker | Returns current user's email, leetcodeUsername, codeforcesUsername |
| `GET /api/cron/daily-question` | `app/api/cron/daily-question/route.ts` | Cron secret | [[actions#daily-question-cron]] | Send daily LeetCode question emails |
| `GET /api/cron/contest-reminder` | `app/api/cron/contest-reminder/route.ts` | Cron secret | [[actions#contest-reminder-cron]] | Send contest reminder emails |
| `GET/POST /api/solution-review` | `app/api/solution-review/route.ts` | **Auth required** | [[components#aiinterviewcoach]] `AiInterviewCoach` | Enqueue/poll solution review jobs. See [[actions#post-apisolution-review]], [[actions#get-apisolution-review]]. |
| `GET /api/question/code` | `app/api/question/code/route.ts` | **Auth required** | [[components#aiinterviewcoach]] `AiInterviewCoachWrapper` | Returns authenticated user's saved code and language for a question. See [[actions#get-apiquestioncode]]. |
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

- **Middleware** (`middleware.ts`) protects `/dashboard`, `/admin`, `/stats`, `/codeforces`, `/planner`, `/reviews`, `/readiness`, `/coach`, and `/interview` by checking for Better Auth session cookie. See [[configuration#config-files]].
- **Offline support** — The root layout registers a service worker (`/sw.js`) via `Script` tag and links `manifest.json` for PWA standalone mode. The `OfflineBanner` component shows an offline toast on any page. The `ReviewQueue` falls back to IndexedDB cache when offline. See [[architecture#pwa--offline-support]] and [[components#offline-banner]].
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
- Lean layout: shows `StatsOverview`, quick link buttons to [[pages#stats-leetcode-stats]] and [[pages#codeforces-codeforces]], Linked Accounts section ([[components#dashboard]] `LeetCodeUsernameForm` + [[components#codeforces]] `CodeforcesUsernameForm` + `EmailSubscriptionToggle`), and `CompanyProgress`.
- The heavy stats components (`LeetCodeStats`, `SubmissionHeatmap`, `SkillBars`, `ContestStats`, `SolvedProgress`, `DailyProblemCard`) have been moved off the dashboard to dedicated [[pages#stats-leetcode-stats]] page for a faster, cleaner dashboard experience.
- `LeetCodeUsernameForm` for linking LeetCode profile (triggers [[actions#sync]] via POST `/api/sync`).
- `CodeforcesUsernameForm` for linking Codeforces handle (calls [[actions#codeforcests]] `saveCodeforcesUsername`).

### Stats `/stats`
- Auth required. Shows LeetCode username form or full LeetCode stats.
- Fetches data from [[actions#get-leetcode-stats]] and [[actions#get-leetcode-calendar]] APIs.
- Computes `slugToQuestionId` map from user's question set so the `RecentSolvedList` can deep-link to local question pages.

### Codeforces `/codeforces`
- Auth required. Shows Codeforces username form or profile.
- Profile includes: [[components#codeforces]] `CodeforcesUserCard` (avatar, handle, rating, rank, contribution), `RatingHistoryChart` (Recharts line chart with rank tier reference lines), and `ContestHistoryTable` (contest name, rank, rating changes, date).
- Data proxied through [[actions#get-apicodeforcesuserhandle]] and [[actions#get-apicodeforcesratinghandle]] (Redis cached).

### Search `/search`
- CSR with debounced search input (300ms).
- Calls [[actions#get-apisearchqpage1pagesize20]] API endpoint.
- Results rendered by [[components#search]] `SearchResults`.
- Pagination via `page` URL param.

### Admin `/admin/questions`
- **Admin role required** — checks `session.user.role === "admin"`.
- [[components#admin]] `AdminQuestionsForm`: single question import by LeetCode URL, CSV file upload.
- Calls [[actions#admints]] `importQuestion()` and `bulkImportCSV()`.
