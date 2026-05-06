# LeetCode Company Tracker — Wiki Index

A web app for tracking LeetCode problems organized by company. Browse questions by company and time period, mark problems as solved, write markdown notes, search with fuzzy matching, and view progress stats.

## Page Catalog

| Page | Summary | Key Links To |
|------|---------|-------------|
| [[architecture]] | Tech stack, data flow, design decisions | [[data-model]], [[actions]], [[configuration]], [[conventions]] |
| [[data-model]] | Prisma schema — User, Question, Company, CompanyQuestion, UserQuestion | [[architecture]], [[actions]], [[components]], [[configuration]] |
| [[pages]] | All routes, URL params, auth guards | [[components]], [[actions]], [[architecture]], [[configuration]] |
| [[components]] | UI component tree, props, states | [[pages]], [[actions]], [[conventions]], [[architecture]] |
| [[actions]] | Server actions, API routes, data flow | [[data-model]], [[pages]], [[components]], [[conventions]] |
| [[configuration]] | Environment variables, config files | [[architecture]], [[data-model]], [[pages]], [[actions]] |
| [[conventions]] | Coding style, naming, patterns | [[actions]], [[components]], [[architecture]] |

## Changelog

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
