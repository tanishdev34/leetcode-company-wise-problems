# LeetCode Company Tracker — Wiki Index

A web app for tracking LeetCode problems organized by company. Browse questions by company and time period, mark problems as solved, write markdown notes, search with fuzzy matching, and view progress stats.

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
- Updated {{AGENTS.md}} project structure.

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
- Created `lib/email.ts` — nodemailer utility with styled HTML email templates.
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
