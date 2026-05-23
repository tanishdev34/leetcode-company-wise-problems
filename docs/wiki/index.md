# LeetCode Company Tracker — Wiki Index

A web app for tracking LeetCode problems organized by company. Browse questions by company and time period, mark problems as solved, write markdown notes, search with fuzzy matching, and view progress stats.

For future feature ideas and learning-oriented roadmap options, see [`FEATURES.md`](../../FEATURES.md).

## Page Catalog

| Page | Summary | Key Links To |
|------|---------|-------------|
| [[architecture]] | Tech stack, data flow, design decisions | [[data-model]], [[actions]], [[configuration]], [[conventions]] |
| [[data-model]] | Prisma schema — User, Question, Company, CompanyQuestion, UserQuestion | [[architecture]], [[actions]], [[components]], [[configuration]] |
| [[pages]] | All routes, URL params, auth guards, Codeforces & Stats pages | [[components]], [[actions]], [[architecture]], [[configuration]] |
| [[components]] | UI component tree, props, states (including Codeforces components) | [[pages]], [[actions]], [[conventions]], [[architecture]] |
| [[actions]] | Server actions, API routes, data flow (including Codeforces APIs) | [[data-model]], [[pages]], [[components]], [[conventions]] |
| [[configuration]] | Environment variables, config files | [[architecture]], [[data-model]], [[pages]], [[actions]] |
| [[conventions]] | Coding style, naming, patterns | [[actions]], [[components]], [[architecture]] |
| [[extension]] | Browser extension — Chrome/Edge Manifest V3, data extraction, setup, LC stats | [[actions#post-apiextensionadd-solution]], [[data-model]] |

## Changelog

### [2026-05-23] Navbar overflow fix
- **Navbar** — desktop authenticated navigation now reserves the row for navigation/actions only, removing the collapsible top-nav search slot that could overlap `+ Add Questions`. The signed-in link rail uses shrinkable flex constraints plus internal horizontal scrolling so recently added links (`Readiness`, `Coach`, `Interview`, `Codeforces`) stay inside the viewport. See [[components#layout]].
- **Regression test** — added `tests/components/navbar.test.tsx` to verify the authenticated desktop nav omits the top-nav search input and keeps `min-w-0` + `overflow-x-auto` layout constraints.

### [2026-05-23] Mock Interview Room (Feature 10)
- **Mock Interview Room** — new `/interview` page with `InterviewRoom` component for timed solo practice sessions. See [[components#interview-room]].
- **`InterviewSession` model** — new Prisma model tracking session state (`in_progress`/`completed`/`cancelled`) with duration, rating, notes, and reflection. See [[data-model#interviewsession]].
- **`actions/interview.ts`** — server actions for interview lifecycle: `startInterview()`, `completeInterview()`, `cancelInterview()`, `getInterviewHistory()`, `getRandomQuestion()`. See [[actions#actionsinterviewts]].
- **Setup phase** — user selects difficulty (Easy/Medium/Hard/Random) and duration (15/30/45/60 min).
- **Interview phase** — countdown timer (visual urgency when < 5 min), question info with LeetCode link, notes textarea, Complete/Cancel buttons.
- **Rating phase** — 1-5 star self-rating + reflection textarea after completing the session.
- **Recap phase** — session summary with duration, rating, reflection, question link, and recent history.
- **History** — list of past sessions with status badges, ratings, and durations.
- **Navbar** — "Interview" link added in desktop and mobile nav (before Codeforces).
- **Command palette** — "Mock Interview Room" entry with Play icon added.
- **Middleware** — `/interview` added to protected routes and matcher.

### [2026-05-23] Offline Review Mode (Feature 9)
- **PWA Service Worker** — `public/sw.js` caches static pages on install, uses Cache-First strategy for review/question/stats API responses, and serves cached content when offline. See [[architecture#pwa--offline-support]].
- **PWA Manifest** — `public/manifest.json` enables standalone mode with dark theme colors. Linked in [[pages]] root layout.
- **`lib/offline.ts`** — Client-only IndexedDB utility wrapping `idb-keyval` for caching reviews, notes, and sync timestamps. Exports `cacheReviews()`, `getCachedReviews()`, `cacheNotes()`, `getCachedNote()`, `clearOfflineCache()`, `isOnline()`, and `onOnlineChange()`. See [[architecture#libofflinets]].
- **`OfflineBanner`** — Fixed bottom-right toast showing "Offline — showing cached data" with pulsing amber dot. Appears on any page when the browser goes offline. See [[components#offline-banner]].
- **`ReviewQueue` offline support** — On fetch failure (offline), loads reviews from IndexedDB cache and displays an inline offline indicator with last-sync timestamp. See [[components#reviewqueue]].
- **`next.config.mjs` headers** — `sw.js` gets `Service-Worker-Allowed: /` header; `manifest.json` gets caching headers.
- **Dependency** — `idb-keyval` added for IndexedDB access.

### [2026-05-23] AI Interview Coach (Feature 6)
- **AI Interview Coach** — new `/coach` page with `AiInterviewCoach` component that analyzes saved code and returns structured interview-style feedback on correctness, complexity, edge cases, explanation quality, follow-up questions, and improvement suggestions. Uses Cerebras via AI SDK with structured output.
- **`SolutionReview` model** — new Prisma model tracking review job state (`pending`/`running`/`done`/`error`) with fields for structured AI output. See [[data-model#solutionreview]].
- **`lib/solution-review.ts`** — background worker with retry/backoff (similar to `lib/analyze.ts`) that processes reviews via Cerebras.
- **`POST/GET /api/solution-review`** — enqueue and poll endpoints for solution reviews. See [[actions#post-apisolution-review]].
- **`GET /api/question/code`** — API route returning the authenticated user's saved code for a question. See [[actions#get-apiquestioncode]].
- **`enqueueSolutionReview(questionId)`** — server action in `actions/questions.ts` to enqueue a review. See [[actions#actionsquestionsts]].
- **Navbar** — "Coach" link added in desktop and mobile nav.
- **Command palette** — "AI Interview Coach" entry added.
- **Middleware** — `/coach` added to protected routes and matcher.

### [2026-05-23] Extension inline overlay
- **Extension Overlay** — floating pill on LeetCode problem pages showing solved status, company frequency, review status, notes preview, and quick toggle solved. Uses Shadow DOM for style isolation. See [[extension#overlay-content-script]].
- **`GET /api/question/overlay`** — API route returning overlay data (public + optional authenticated fields).
- **`POST /api/questions/toggle-solved`** — API route for toggling solved status from the extension.
- Background worker handles `GET_OVERLAY_DATA` and `TOGGLE_SOLVED` messages.

### [2026-05-23] Top 5 features implemented
- **Command Palette** — `cmdk`-based keyboard-driven navigation (`Cmd+K`/`Ctrl+K`) for all pages. See [[components#command-palette]].
- **Notes Templates** — Three structured templates in `NoteEditor`: Pattern/Intuition/Complexity/Mistakes, Brute Force→Optimal, Interview Explanation. See [[components#questions]].
- **Study Planner** — Weekly study plans with `StudyPlan` + `StudyPlanItem` models, day-by-day question assignment with search, completion tracking. See [[data-model#studyplan]] and [[pages]] `/planner`.
- **Spaced Repetition Review Queue** — `ReviewItem` model with confidence-based intervals (1d/2d/4d/7d/14d), auto-scheduled on solve, review session UI. See [[data-model#reviewitem]] and [[pages]] `/reviews`.
- **Interview Readiness Score** — Per-company readiness scoring (solved ratio 0-40, difficulty coverage 0-20, recency 0-20, review freshness 0-20). See [[actions#readinessts]] and [[pages]] `/readiness`.

### [2026-05-21] Learning-oriented feature roadmap

- Created [`FEATURES.md`](../../FEATURES.md) as a root-level roadmap for skill-building feature ideas across UI/UX polish, analytics, AI, browser extension work, mobile/PWA features, backend systems, testing, observability, and collaboration.
- The roadmap includes recommended build order, suggested libraries, difficulty levels, and the engineering skills each feature is meant to practice.

### [2026-05-16] Email + extension visual refresh
- **Emails** — rewrote `emails/daily-question.tsx` and `emails/contest-reminder.tsx` with gradient hero panels (indigo→fuchsia for daily, amber→rose→magenta for contest), date badge column, motivational quote card (seeded per-day/per-contest from a curated pool), brand wordmark header. `daily-question` now accepts an optional `streak` prop.
- **Extension popup** — dark theme with radial-gradient backdrop, floating decorative orbs, glassmorphism cards (`glass` utility), staggered `card-enter` entrance animations, shimmer loading skeletons, animated horizontal difficulty bars (`DifficultyBar`) replacing the inline easy/med/hard text, gradient hero card for "Today", gradient brand wordmark, hover lifts on cards/buttons. New CSS utilities in `entrypoints/popup/style.css`: `card-enter`, `card-delay-{1..5}`, `bar-grow`, `shimmer-bg`, `glass`, `brand-gradient-text`, `orb`, plus `fadeUp`, `shimmer`, `pulseGlow`, `growBar`, `floatOrb` keyframes.

### [2026-05-16] React Email migration — beautiful email templates
- Migrated email templates from raw HTML strings to **React Email** component-based architecture.
- Created `emails/daily-question.tsx` — React Email component for daily problem (Tailwind + pixelBasedPreset).
- Created `emails/contest-reminder.tsx` — React Email component for contest reminders.
- Updated `lib/email.tsx` — now uses `render()` from `react-email` to generate HTML from JSX components.
- Added `react-email` dependency — ensures better email client compatibility, proper HTML structure, and easier maintenance.
- Email templates now use Tailwind CSS with pixel-based preset for cross-client consistency.
- Updated `app/api/cron/daily/route.ts` — calls new async `renderDailyQuestionEmail` / `renderContestReminderEmail`.

### [2026-05-16] Codeforces integration, full stats page, dashboard reorg, extension enhancement
- Added [[data-model#user]] `codeforcesUsername` field — linked via [[actions#codeforcests]] `saveCodeforcesUsername`.
- Created `actions/codeforces.ts` — [[actions#codeforcests]] server action to save Codeforces handle.
- Created [[pages#codeforces-codeforces]] — Codeforces profile page with rating card, rating history chart, contest history table.
- Created [[pages#stats-leetcode-stats]] — LeetCode full stats page (solved progress, contest stats, heatmap, skills, recents).
- Created [[actions#get-apicodeforcesuserhandle]] and [[actions#get-apicodeforcesratinghandle]] — proxy to Codeforces API, Redis cached.
- Created [[actions#get-apiuserprofile]] — returns current user's profile (email, linked usernames).
- Created Codeforces components: [[components#codeforces]] `CodeforcesUserCard`, `RatingHistoryChart`, `ContestHistoryTable`, `CodeforcesProfile`, `CodeforcesUsernameForm`.
- Reorganized [[pages#dashboard-dashboard]] — removed bulky LeetCodeStats components, added quick links to [[pages#stats-leetcode-stats]] and [[pages#codeforces-codeforces]], added [[components#codeforces]] `CodeforcesUsernameForm` in Linked Accounts section.
- Updated [[components#layout]] `Navbar` — added "Stats" and "Codeforces" desktop + mobile nav links.
- Updated [[middleware]] — `/stats` and `/codeforces` added to protected routes and matcher.
- Enhanced [[extension]] — popup now shows LeetCode stats (easy/medium/hard), motivation quotes, animated counters (`AnimatedCounter`), `fadeSlideIn` entry animation. Background worker handles `GET_USER_PROFILE` and `GET_LEETCODE_STATS` messages.
- Added [[actions#get-apiquestionsrecommend]] — `GET /api/questions/recommend` suggests unsolved questions by topic overlap with user's solved questions.
- Extension popup enhanced further: live quotes from zenquotes.io, contest rating display, recommended next question card, code extraction from Monaco editor on all problem pages.


### [2026-05-16] Browser extension
- Created `leetcode-extension/` — Chrome/Edge Manifest V3 extension for adding LeetCode questions and solutions directly from LeetCode.com.
- Created [[extension]] — documentation for extension structure, setup, usage, and data flow.
- Added `POST /api/extension/add-solution` API route — upserts questions and saves solution code. See [[actions#post-apiextensionadd-solution]].
- Updated [[AGENTS.md]] project structure to include `leetcode-extension/`.

### [2026-05-07] AI analysis moved to background queue
- Added [[data-model#analysisjob-ai-analysis-queue]] model — tracks `pending`/`running`/`done`/`error` plus `attempts`/`maxAttempts`.
- Added `lib/analyze.ts` — `processAnalysisJob(jobId)` worker with exponential backoff (2s, 8s, 30s) up to 3 attempts.
- Added [[actions#post-apianalyze]] and [[actions#get-apianalyzequestionid]] — enqueue + poll endpoints. Worker is scheduled via `next/server`'s `after()` so it survives the user closing the page.
- Removed deprecated `analyzeCode` server action from `actions/questions.ts`.
- Updated [[components#questions]] `NoteEditor` — Generate button now POSTs to `/api/analyze`, polls `/api/analyze` for job status, and resumes polling on remount if a job is still running.
- Created [[CLAUDE.md]] (mirrors [[AGENTS.md]]).

### [2026-05-07] Email reminders — daily question + contest alerts
- Added `emailSubscribed` field to [[data-model#user]] model.
- Created `actions/email.ts` — [[actions#emailts]] toggle subscription server action.
- Created `components/email-subscription-toggle.tsx` — [[components#dashboard]] toggle button on dashboard (beside sync).
- Created `lib/email.tsx` — React Email + nodemailer utility for component-based email templates.
- Created `emails/` — React Email components for daily problem and contest reminders.
- Created `app/api/cron/daily-question/route.ts` — [[actions#daily-question-cron]] sends daily LeetCode problem at 11 AM IST.
- Created `app/api/cron/contest-reminder/route.ts` — [[actions#contest-reminder-cron]] runs every 6 hours, sends reminders 30 min–2 hours before contests.
- Created `vercel.json` with cron schedules (see [[configuration#config-files]]).
- Updated `.env` with SMTP and cron config (see [[configuration#environment-variables]]).

### [2026-05-06] Wiki overhaul + solved-first sorting
- Modified `actions/questions.ts` — [[actions]] now sorts solved questions first (by `solvedAt` descending), then unsolved (by `frequency` descending). See [[actions#getCompanyQuestions-sorting-logic]] for details.
- Created `docs/wiki/` with comprehensive project documentation.
- Created [[AGENTS.md]] as agent entry point.
- Enhanced all wiki pages with dense cross-references for [[architecture#key-design-decisions|graph view]] interconnectivity.

### [2026-05-03] Initial project scaffold
- Design spec and implementation plan created.
- Next.js 16 + Prisma + Better Auth + PostgreSQL setup (see [[architecture]] and [[configuration]]).
