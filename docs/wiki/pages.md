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
| `/` | `app/(main)/page.tsx` | Public (SSR) | [[components#search]] `SearchBar`, [[components#company]] `CompanyCard`, [[components#questions]] `DifficultyBadge`. "View all" links to `/library`. | Direct Prisma (no action) |
| `/today` | `app/(main)/today/page.tsx` | **Auth required** | `TodayView` (quick-stats, active roadmaps, due reviews, recently solved) + `SyncSolvedButton` (LeetCode sync, POST `/api/sync`) | [[actions#roadmaps]], [[actions#reviewts]], direct Prisma |
| `/roadmaps` | `app/(main)/roadmaps/page.tsx` | **Auth required** | `RoadmapView`, `RoadmapCreateDialog` | [[actions#roadmaps]] |
| `/library` | `app/(main)/library/page.tsx` | **Auth required** | `LibraryView` (companies + topics browser; links to `/companies/[slug]`, `/search`) | Direct Prisma |
| `/settings` | `app/(main)/settings/page.tsx` | **Auth required** | `SettingsView` → `LeetcodeUsernameForm`, `CodeforcesUsernameForm`, `EmailSubscriptionToggle` | [[actions#profilets]], [[actions#codeforcests]], [[actions#email]] |
| `/companies/[slug]` | `app/(main)/companies/[slug]/page.tsx` | Public (CSR) | [[components#company]] `TimePeriodTabs`, [[components#question-table]] `QuestionTable` | [[actions#getCompanyQuestions]] |
| `/search` | `app/(main)/search/page.tsx` | Public (CSR) | [[components#search]] `SearchBar`, [[components#search]] `SearchResults` | [[actions#get-apisearchqpage1pagesize20]] via fetch |
| `/questions/[id]` | `app/(main)/questions/[id]/page.tsx` | Public (CSR) | [[components#questions]] `NoteEditor`, `DifficultyBadge`, checkbox | [[actions#getQuestionDetail]], [[actions#getNotes]], [[actions#toggleSolved]] |
| `/admin/questions` | `app/(main)/admin/questions/page.tsx` | **Auth required** | [[components#admin]] `AdminQuestionsForm` | [[actions#admints]] |
| `/reviews` | `app/(main)/reviews/page.tsx` | **Auth required** | [[components#reviewqueue]] `ReviewQueue` | [[actions#reviewts]] |
| `/memory` | `app/(main)/memory/page.tsx` | **Auth required** | [[components#mistake-memory]] `MistakeMemoryView` | [[actions#actionsmistake-memoryts]] |
| `/coach` | `app/(main)/coach/page.tsx` | **Auth required** | `CoachView` (spaced-repetition reviews, links to `/reviews`, `/interview`, `/memory`) | [[actions#reviewts]] |
| `/interview` | `app/(main)/interview/page.tsx` | **Auth required** | [[components#interview-room]] `InterviewRoom` | [[actions#actionsinterviewts]] `startInterview()`, `completeInterview()`, `cancelInterview()`, `getInterviewHistory()`, `getRandomQuestion()` |
| `/admin/system-map` | `app/(main)/admin/system-map/page.tsx` | **Admin required** | [[components#system-map]] `SystemMapView` | [[actions#actionssystem-mapts]] |

> **Removed in the redesign (June 2026):** `/dashboard` (→ `/today`), `/companies` index (→ `/library`), `/stats` (LeetCode sync moved to the `SyncSolvedButton` on `/today`), and the standalone feature pages `/codeforces`, `/planner`, `/readiness`, `/learning`, `/reports`, `/playground`, `/whiteboard`. Their view components were deleted; the underlying API routes and server actions for some still exist but are no longer surfaced in the UI.

### API Routes

| Route | File | Auth | Called By | Description |
|-------|------|------|-----------|-------------|
| `GET /api/search?q=&page=` | `app/api/search/route.ts` | Public | [[components#search]] `SearchBar` → [[pages#search-search]] | pg_trgm fuzzy search |
| `POST /api/sync` | `app/api/sync/route.ts` | **Auth required** | `SyncSolvedButton` on `/today` | Sync LeetCode submissions |
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
| `POST /api/playground/cpp` | `app/api/playground/cpp/route.ts` | **Auth required** | [[components#code-playground]] `CodePlaygroundView` | Compiles and runs C++ stdin/stdout tests via Wandbox. See [[actions#post-apiplaygroundcpp]]. |
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

- **Middleware** (`middleware.ts`) protects `/admin`, `/reviews`, `/memory`, `/coach`, `/interview`, `/roadmaps`, `/today`, `/library`, and `/settings` by checking for Better Auth session cookie. See [[configuration#config-files]].
- **Offline support** — The root layout registers a service worker (`/sw.js`) via `Script` tag and links `manifest.json` for PWA standalone mode. The `OfflineBanner` component shows an offline toast on any page. The `ReviewQueue` falls back to IndexedDB cache when offline. See [[architecture#pwa--offline-support]] and [[components#offline-banner]].
- **Server components** (e.g., the `/today` page) call `auth.api.getSession()` server-side and redirect if not authenticated.
- **Server actions** call `auth.api.getSession()` and return `{ success: false, error: "Not authenticated" }`. See [[conventions#server-action-pattern]].
- **Public routes** work without auth; solved status/notes are simply not shown.

## Page Behavior

### Landing Page `/`
- SSR: fetches top 12 companies (by question count), total counts, last 10 questions via direct Prisma queries.
- Components: [[components#search]] `SearchBar`, stats cards, [[components#company]] `CompanyCard` grid, recently added list.

### Today `/today`
- Auth required. Landing page for authenticated users (post-login redirect target).
- Renders `TodayView`: quick-stats row, active roadmaps, due reviews, recently solved (deep-links to `/questions/[id]`).
- Header includes `SyncSolvedButton`, which POSTs to `/api/sync` to pull the user's accepted LeetCode submissions and mark matching questions solved.

### Library `/library`
- Auth required. Browse companies and topics; replaces the old `/companies` index.
- `LibraryView` links each company to [[pages#company-detail-companiesslug]] and each topic to `/search`.

### Company Detail `/companies/[slug]`
- CSR: fetches questions via [[actions#getCompanyQuestions]] server action.
- Shows [[components#company]] `TimePeriodTabs` (5 tabs) and paginated [[components#question-table]] `QuestionTable`.
- URL search params for bookmarkable state (period + page).
- **Sorting:** solved questions first (by `solvedAt` desc), then unsolved (by `frequency` desc). See [[actions#getCompanyQuestions-sorting-logic]].

### Settings `/settings`
- Auth required. Account and integrations settings.
- `SettingsView` renders `LeetcodeUsernameForm` (links profile, used by the Today sync), `CodeforcesUsernameForm`, and `EmailSubscriptionToggle`.

### Search `/search`
- CSR with debounced search input (300ms).
- Calls [[actions#get-apisearchqpage1pagesize20]] API endpoint.
- Results rendered by [[components#search]] `SearchResults`.
- Pagination via `page` URL param.

### Admin `/admin/questions`
- **Admin role required** — checks `session.user.role === "admin"`.
- [[components#admin]] `AdminQuestionsForm`: single question import by LeetCode URL, CSV file upload.
- Calls [[actions#admints]] `importQuestion()` and `bulkImportCSV()`.

### Mistake Memory `/memory`
- Auth required. Renders [[components#mistake-memory]] `MistakeMemoryView`.
- Builds recurring mistake patterns from solution reviews, low-confidence reviews, and mock interview reflections.
- Calls [[actions#actionsmistake-memoryts]] `getMistakeMemory()`.

### System Map `/admin/system-map`
- Admin required. Renders [[components#system-map]] `SystemMapView`.
- Scans project source paths on the server and uses React Flow to visualize pages, API routes, components, server actions, Prisma schema, and wiki docs.
- Calls [[actions#actionssystem-mapts]] `getSystemMap()`.
