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
| [[future-designs]] | Planning-only design docs for the modern UI cleanup, generated roadmaps, LeetCode GraphQL sync, and OpenRouter AI migration | [[architecture]], [[pages]], [[components]], [[actions]], [[data-model]], [[configuration]] |

## Changelog

### [2026-06-09] Redesign cleanup — removed orphaned pages, fonts, Today sync
- **Removed pages** no longer part of the redesign: `/dashboard` (→ `/today`), `/companies` index (→ `/library`), `/stats` (LeetCode sync moved to Today), and feature pages `/codeforces`, `/planner`, `/readiness`, `/learning`, `/reports`, `/playground`, `/whiteboard`. Deleted their now-orphaned view components. See [[pages]] and [[components]].
- **Sync button** — added `components/sync-solved-button.tsx` (`SyncSolvedButton`) to the Today page header; it POSTs to `/api/sync`. Previously the only sync trigger lived on the now-deleted `/stats` page.
- **Fonts/contrast** — `Doto` (dotted) is now used only for headings and the "LC Tracker" brand (`--font-display`); body text switched to `JetBrains Mono` (`--font-sans`) for legibility. Bumped dark-theme `--muted-foreground`, `--border`, `--input`, and `--sidebar-border` for higher contrast. See [[conventions#styling]].
- **Redirects/nav** — post-login redirect now targets `/today` (was `/dashboard`); navbar, mobile nav, command palette, and middleware updated to drop removed routes.

### [2026-06-08] OpenRouter AI SDK migration docs
- Added a planning-only design doc for moving AI analysis and solution review from Crof to OpenRouter through `@ai-sdk/openai`.
- Added an implementation plan that centralizes provider setup in `lib/ai.ts`, uses `OPENROUTER_API_KEY`, and reads `OPENROUTER_MODEL` from `.env` so the model can be changed without code edits.
- Updated [[future-designs]] to link the OpenRouter design and plan.

### [2026-06-08] June 2026 cleanup wave — Roadmaps, GraphQL Sync, macOS UI
- **Roadmap Planner** — new `/roadmaps` page with multi-roadmap study planner. See [[data-model#roadmap]], [[data-model#roadmapitem]], [[data-model#roadmapevent]], and [[actions#roadmaps]]. Replaces manual weekly planner with generated daily question assignments.
- **LeetCode GraphQL Sync** — `POST /api/sync` now uses direct LeetCode GraphQL (`lib/leetcode-graphql.ts`) instead of `alfa-leetcode-api`. Hydrates missing questions immediately via GraphQL. Added [[data-model#syncrun]] and `Question.titleSlug`.
- **OpenRouter AI Migration** — replaced Crof AI with OpenRouter via `@ai-sdk/openai`. `OPENROUTER_MODEL` env var controls model selection. See `lib/ai.ts`.
- **macOS UI Redesign** — new sidebar navigation (`components/sidebar.tsx`) for authenticated users. Added `/today`, `/library`, `/settings` pages. Primary nav: Today, Roadmaps, Library, Coach. Old routes preserved for backward compat.
- **Today page** — command center showing active roadmaps, due reviews, recently solved. See `components/today-view.tsx`.
- **Library page** — unified browser for companies and topics. See `components/library-view.tsx`.
- **Coach consolidation** — merged review queue into Coach page. See `components/coach-view.tsx`.
- **Settings page** — account info, linked accounts, notifications. See `components/settings-view.tsx`.
- Updated middleware, navbar, command palette, and mobile navigation for new routes.

### [2026-06-08] Planning docs for modern UI cleanup, roadmaps, and GraphQL sync
- Added planning-only design docs for a macOS-style product simplification pass, reducing the app toward Today, Roadmaps, Library, Coach, and Settings.
- Added a generated multi-roadmap planner design that replaces the manual weekly planner with company/topic/deadline-based plans assigning exact questions per day.
- Added a LeetCode GraphQL sync design to replace `alfa-leetcode-api` in solved-question sync and hydrate missing question metadata immediately while leaving solution-code capture to the extension.
- Added [[future-designs]] as the wiki entry point for these planning docs and their research references.

### [2026-05-25] C++ playground runner
- Extended `/playground` from a JavaScript-only test pad into a language-tabbed code playground with JavaScript and C++ modes.
- Added `lib/cpp-playground.ts` to generate a stdin/stdout C++ harness and normalize Wandbox compile/run responses.
- Added authenticated `POST /api/playground/cpp`, which compiles and runs C++ through Wandbox using GCC, returning stdout, stderr, compiler output, and runner status.
- Updated `CodePlaygroundView` with C++ starter code, stdin-style tests, and compiler/runtime output panels.
- Refined the authenticated desktop navbar to remove the horizontal scrolling rail: primary links stay visible, secondary destinations move into a compact More menu, and admin/sign-out actions stay pinned on the right.

### [2026-05-25] Learning graph, study reports, and system map
- Added `/learning` with `LearningGraphView`, `actions/learning-graph.ts`, and `lib/learning-graph.ts` to visualize topic → question → company relationships, weak/strong topic clusters, and due-review pressure using React Flow (`@xyflow/react`).
- Added `/reports` with `StudyReportView`, `actions/study-report.ts`, and `lib/study-report.ts` to generate a weekly study report with metrics, highlights, recommendations, company focus, and topic momentum.
- Added `/admin/system-map` with `SystemMapView`, `actions/system-map.ts`, and `lib/system-map.ts` to scan the local project structure and render an admin architecture map of pages, API routes, components, actions, schema, and docs.
- Updated navigation, command palette, middleware, package dependencies, and tests for the new graph/report features.

### [2026-05-25] Mistake memory, JS playground, and whiteboard
- Added `/memory` with `MistakeMemoryView`, `actions/mistake-memory.ts`, and `lib/mistake-memory.ts` to surface recurring mistake patterns and recommendations from solution reviews, low-confidence reviews, and mock interview reflections.
- Added `/playground` with `CodePlaygroundView` and `lib/code-playground.ts` for a lightweight client-side JavaScript `solve(...)` test-case runner.
- Added `/whiteboard` with `WhiteboardView` and `lib/whiteboard.ts` for a localStorage-backed SVG sketchpad for interview and DSA visual notes.
- Updated navigation, command palette, middleware, roadmap status, and tests for these second-wave features.

### [2026-05-23] Next feature wave added to roadmap

- Updated [`FEATURES.md`](../../FEATURES.md) with a new May 23 feature wave now that the first ten roadmap items are implemented.
- New roadmap ideas include whiteboard interview mode, in-browser code runner, agentic study copilot, learning knowledge graph, personal mistake memory, durable workflow engine, voice mock interviewer, generated study reports, accessibility/design-system pass, and codebase intelligence map.
- Added current library/product inspiration including tldraw, Excalidraw, WebContainers, assistant-ui, CopilotKit, Mastra, React Flow/xyflow, Trigger.dev, React Aria Components, and shadcn blocks.

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
- **AI Interview Coach** — new `/coach` page with `AiInterviewCoach` component that analyzes saved code and returns structured interview-style feedback on correctness, complexity, edge cases, explanation quality, follow-up questions, and improvement suggestions. Uses Crof AI (Anthropic-compatible) via AI SDK (`@ai-sdk/anthropic`, shared client in `lib/ai.ts`) with structured output.
- **`SolutionReview` model** — new Prisma model tracking review job state (`pending`/`running`/`done`/`error`) with fields for structured AI output. See [[data-model#solutionreview]].
- **`lib/solution-review.ts`** — background worker with retry/backoff (similar to `lib/analyze.ts`) that processes reviews via Crof AI (shared `@ai-sdk/anthropic` client in `lib/ai.ts`).
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
