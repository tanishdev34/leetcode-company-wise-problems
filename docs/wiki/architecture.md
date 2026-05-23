# Architecture

> **See also:** [[data-model]] | [[actions]] | [[configuration]]

## Tech Stack

| Layer | Technology | Config |
|-------|-----------|--------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript | [[configuration#config-files]] |
| **Styling** | Tailwind CSS v4 + shadcn/ui | [[configuration]] |
| **Animations** | React Bits (BlurText, AnimatedContent, SpotlightCard, etc.) | [[components#animation-components-react-bits]] |
| **Database** | PostgreSQL (Neon/Supabase) | [[data-model]], [[configuration#prisma]] |
| **ORM** | Prisma 7 | [[data-model]], [[configuration#prisma]] |
| **Auth** | Better Auth (email/password + Google OAuth) | [[configuration#better-auth]], [[components#auth]] |
| **Search** | PostgreSQL `pg_trgm` extension | [[configuration#search-index]], [[actions#get-apisearchqpage1pagesize20]] |
| **Caching** | Upstash Redis | [[configuration#environment-variables]] |
| **AI Analysis** | Cerebras via AI SDK (`@ai-sdk/cerebras`) — queued background jobs via `next/server` `after()` with retry/backoff | [[actions#post-apianalyze]], [[data-model#analysisjob-ai-analysis-queue]] |
| **AI Interview Coach** | Cerebras via AI SDK — structured interview feedback on saved code | [[actions#post-apisolution-review]], [[data-model#solutionreview]] |
| **Email** | React Email (component-based templates) + Nodemailer (transport) | [[actions#emailts]], [[lib/email]] |
| **PWA / Offline** | Service Worker (`public/sw.js`) + IndexedDB via `idb-keyval` (`lib/offline.ts`) | [[configuration#config-files]] `next.config.mjs` |
| **Package Manager** | Bun | [[configuration#package-scripts]] |

## Data Flow

### Browsing (public)
1. Page loads → server component Prisma query → rendered HTML. See [[pages]] for route list.
2. `getCompanyQuestions(slug, timePeriod, page)` — fetches paginated questions, ordered by solved status + frequency. See [[actions#getCompanyQuestions]] and [[data-model#companyquestion-join-table]] for implementation details.

### User actions (authenticated)
1. Client calls server action (e.g., `toggleSolved`). See [[actions]] for all available actions.
2. Action calls `auth.api.getSession()` to verify auth. See [[conventions#server-action-pattern]].
3. On success: Prisma mutation → return `ActionResult<T>`. See [[conventions#server-action-pattern]].
4. On failure: return `ActionResult<never>` with error string.

### Search
1. Client debounces input (300ms) via [[components#search]] `SearchBar` → fetches `/api/search?q=...`.
2. Server runs `pg_trgm` similarity query → paginated results. See [[actions#get-apisearchqpage1pagesize20]] and [[configuration#search-index]].

### PWA / Offline Support
1. **Service Worker** (`public/sw.js`) — registered in [[pages]] root layout via `Script` tag. Caches static pages (`/`, `/reviews`, `/questions/`) on `install`. On `fetch`, uses a Cache-First strategy for API routes containing `review`, `question`, `stats`, or `overlay` in the path; falls back to cache on network failure. Navigation requests fall back to the cached root page.
2. **IndexedDB** (`lib/offline.ts`) — client-only utility using `idb-keyval`. Stores review data under `cached_reviews` key and notes under `cached_notes_map`. Exposed functions: `cacheReviews()`, `getCachedReviews()`, `cacheNotes()`, `getCachedNotesMap()`, `getCachedNote()`, `getLastSyncedTime()`, `clearOfflineCache()`, `isOnline()`, `onOnlineChange()`.
3. **`OfflineBanner`** ([[components#offline-banner]]) — fixed bottom-right amber toast visible on any page when offline. Disappears when connectivity returns.
4. **`ReviewQueue`** ([[components#reviewqueue]]) — on failed fetch, loads reviews from IndexedDB cache and shows an inline offline indicator with last-synced time.

### LeetCode Sync
1. User provides LeetCode username on [[pages#dashboard-dashboard]] → [[components#dashboard]] `LeetCodeUsernameForm`.
2. POST `/api/sync` → fetches LeetCode GraphQL API → upserts [[data-model#userquestion-user-progress]] records.

## Directory Layout

```
actions/           # Server actions (Next.js "use server" functions)
  questions.ts     #   Question CRUD, toggle solved, notes/code/hints
  stats.ts         #   Dashboard statistics
  admin.ts         #   Admin question import (single + CSV)
  profile.ts       #   LeetCode username save
  study-planner.ts #   Study plan CRUD ([[data-model#studyplan]], [[data-model#studyplanitem]])
  review.ts        #   Spaced repetition reviews ([[data-model#reviewitem]])
  readiness.ts     #   Per-company interview readiness scores (derived only)
  interview.ts     #   Mock interview session lifecycle → [[actions#actionsinterviewts]]
                   #   → See [[actions]] for full reference

app/               # Next.js App Router
  (auth)/          #   Auth pages (login, register) → [[pages]]
  (main)/          #   Main app pages (layout with navbar) → [[pages]]
    page.tsx       #     Landing page → [[pages#landing-page]]
    companies/     #     Company listing + detail → [[pages#company-detail-companiesslug]]
    dashboard/     #     Personal stats dashboard → [[pages#dashboard-dashboard]]
    planner/       #     Study planner → [[pages]]
    reviews/       #     Spaced repetition review queue → [[pages]]
    readiness/     #     Interview readiness scores → [[pages]]
    coach/         #     AI Interview Coach → [[pages]]
    interview/     #     Mock Interview Room → [[pages]]
    questions/     #     Individual question detail → [[pages]]
    search/        #     Search results → [[pages]]
    admin/         #     Admin pages → [[pages#admin-adminquestions]]
  api/             #   API routes → [[actions#api-routes]]
    auth/          #     Better Auth handler
    search/        #     Fuzzy search
    sync/          #     LeetCode sync
    leetcode/      #     LeetCode API proxies
    solution-review/  #  Solution review enqueue + poll ([[data-model#solutionreview]])
    question/
      code/        #     User's saved code for a question
      overlay/     #     Overlay data for extension

components/        # React components
  ui/              #   shadcn UI primitives
  auth/            #   Auth forms
  ...              #   Custom components → [[components]] for full listing

generated/prisma/  # Generated Prisma client (auto-generated) → [[data-model]]

lib/               # Shared utilities
  db.ts            #   Prisma client singleton → [[data-model]]
  auth.ts          #   Better Auth server config → [[configuration#better-auth]]
  auth-client.ts   #   Better Auth client config → [[configuration#better-auth]]
  redis.ts         #   Upstash Redis client
  utils.ts         #   cn() utility → [[conventions#styling]]
  analyze.ts       #   AI analysis worker (Cerebras, retry/backoff) → [[data-model#analysisjob-ai-analysis-queue]]
  solution-review.ts  #  AI interview coach worker (Cerebras, structured output, retry/backoff) → [[data-model#solutionreview]]
  offline.ts       #   IndexedDB offline cache utilities (idb-keyval) → [[architecture#pwa--offline-support]]

public/            # Static assets
  sw.js            #   Service Worker → [[architecture#pwa--offline-support]]
  manifest.json    #   PWA manifest → [[architecture#pwa--offline-support]]

prisma/            # Database
  schema.prisma    #   Schema → [[data-model]]
  seed.ts          #   CSV import script → [[data-model]]

emails/             # React Email components (daily question, contest reminders) → [[actions#emailts]]

docs/              # Documentation
  wiki/            #   Project wiki (this) → [[index]]
  superpowers/     #   Design specs & plans

FEATURES.md        # Learning-oriented feature roadmap and library ideas → [[index]]
```

## Key Design Decisions

1. **[[data-model#companyquestion-join-table|CompanyQuestion join table]]** — Questions are linked to companies via a join table with time period and frequency. A question can appear in the same company multiple times across different time periods. This enables the `TimePeriod` filtering in [[components#company]] `TimePeriodTabs`.
2. **[[data-model#userquestion-user-progress|UserQuestion]]** — Only created when a user first interacts (toggles solved, writes notes). Uses upsert pattern. See [[actions#toggleSolved]].
3. **[[conventions#server-action-pattern|ActionResult\<T\>]]** — All server actions return a discriminated union `{ success: true; data: T } | { success: false; error: string }`. No exceptions thrown to the client.
4. **Pagination** — Page-based (not infinite scroll), 50 items per page, URL search params for bookmarkability. See [[pages#url-parameter-details]].
5. **Search** — Uses pg_trgm trigram similarity at the database level, with a minimum 2-character query. See [[configuration#search-index]].
