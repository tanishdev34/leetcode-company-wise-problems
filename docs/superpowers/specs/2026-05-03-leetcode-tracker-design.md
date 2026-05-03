# LeetCode Company Tracker — Design Spec

## Overview

A web application for tracking LeetCode problems organized by company. Users can browse questions by company and time period, mark problems as solved, write markdown notes, search questions with fuzzy matching, and view progress statistics.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: React Bits (primary, animated components) + shadcn (functional UI components)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (cloud — Neon or Supabase)
- **ORM**: Prisma
- **Auth**: Better Auth (email/password + Google OAuth)
- **Search**: PostgreSQL `pg_trgm` extension for fuzzy search
- **Fonts**: Geist, JetBrains Mono (already configured)

## Data Model

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum TimePeriod {
  THIRTY_DAYS
  THREE_MONTHS
  SIX_MONTHS
  MORE_THAN_SIX_MONTHS
  ALL
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]
  userQuestions UserQuestion[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  accessTokenExpiresAt DateTime?
  refreshTokenExpiresAt DateTime?
  scope             String?
  idToken           String?
  password          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
}

model Company {
  id        String     @id @default(cuid())
  name      String     @unique
  slug      String     @unique
  questions Question[]

  @@index([slug])
}

model Question {
  id             String     @id @default(cuid())
  title          String
  leetcodeUrl    String
  difficulty     Difficulty
  topics         String[]
  frequency      Float
  acceptanceRate Float
  companyId      String
  timePeriod     TimePeriod
  createdAt      DateTime   @default(now())

  company      Company        @relation(fields: [companyId], references: [id])
  userQuestions UserQuestion[]

  @@unique([leetcodeUrl, companyId, timePeriod])
  @@index([title], ops: gin_trgm_ops) // pg_trgm fuzzy search — requires raw SQL migration: CREATE INDEX CONCURRENTLY idx_question_title_trgm ON "Question" USING gin(title gin_trgm_ops);
  @@index([companyId])
  @@index([difficulty])
}

model UserQuestion {
  id         String    @id @default(cuid())
  userId     String
  questionId String
  solved     Boolean   @default(false)
  solvedAt   DateTime?
  notes      String?   // Markdown content, max 10,000 characters
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId])
  @@index([userId])
  @@index([questionId])
}
```

### Key Design Decisions

- **Questions deduped** by `(leetcodeUrl, companyId, timePeriod)` — same question can appear in multiple companies and time periods
- **UserQuestion** is a join table — only created when a user interacts (toggles solved or writes notes)
- **pg_trgm index** on `Question.title` enables fuzzy/typo-tolerant search at the database level
- **Session/Account** models follow Better Auth's Prisma adapter requirements
- **Notes max length**: 10,000 characters. Markdown rendering supports code blocks (with syntax highlighting via `react-syntax-highlighter`), lists, headings, bold, italic, links. Images are intentionally excluded (XSS risk with user-generated content).

## UI Structure

### Pages

| Route | Purpose |
|---|---|
| `/` | Landing — total questions count, total companies count, search bar, top companies grid (top 12 by question count), recently added questions (last 10 by `createdAt desc`) |
| `/companies` | All companies grid with progress indicators, searchable |
| `/companies/[slug]` | Company detail — question list with time period tabs |
| `/search` | Global fuzzy search results |
| `/auth/login` | Login page |
| `/auth/register` | Register page |
| `/dashboard` | Personal stats — solved count by difficulty, per-company progress, recent activity |

### Component Architecture

**Layout:**
- `RootLayout` — fonts, ThemeProvider, auth context
- `Navbar` — logo, search bar, auth status, dashboard link

**Company views:**
- `CompanyCard` — company name, progress bar (X/Y solved), click to navigate. Shows skeleton while loading.
- `CompanyGrid` — grid of CompanyCards with optional filtering. Shows 12 Skeleton cards while loading. Empty state: "No companies found" message.
- `TimePeriodTabs` — tab switcher for Thirty Days / Three Months / Six Months / More Than Six Months / All. **Default: "All"** when visiting `/companies/[slug]`.

**Question views:**
- `QuestionTable` — paginated list of QuestionRows (50 per page). Pagination via URL search params (`?period=ALL&page=2`) for bookmarkability. Shows Skeleton rows while loading. Empty state: "No questions for this time period" message.
- `QuestionRow` — title (linked to LeetCode), difficulty badge, topics, solved checkbox. Click anywhere on the row to expand/collapse `QuestionDetail`.
- `QuestionDetail` — expandable section below the row containing the markdown notes editor. Lazy-loads notes content on first expand (not pre-fetched with the question list).
- `NoteEditor` — textarea with markdown preview toggle. Max 10,000 characters. Auto-saves on blur (debounced 1s). Shows "Saving..." spinner during save, "Saved" checkmark on success, "Failed to save — retry?" on error.
- `DifficultyBadge` — colored badge (green/yellow/red for EASY/MEDIUM/HARD)

**Search:**
- `SearchBar` — debounced input (300ms), navigates to `/search?q=...` on Enter or after 500ms of typing
- `SearchResults` — paginated list of matching questions with company context. Pagination via URL search params (`?q=...&page=2`). Empty state: "No results found for 'query'" message.

**Dashboard (authenticated only):**
- `StatsOverview` — total solved, solved by difficulty (EASY/MEDIUM/HARD breakdown)
- `CompanyProgress` — per-company progress bars, sorted by most solved first
- `RecentActivity` — last 10 solved questions, sorted by `solvedAt` descending

**Auth:**
- `LoginForm` — email/password + Google sign-in button. Shows inline validation errors.
- `RegisterForm` — email/password registration. Shows inline validation errors.

### React Bits Usage

- `BlurText` or `TextReveal` for page headings
- `AnimatedBackground` on landing page
- `Fade` / `Slide` transitions on card hover
- Smooth page transitions

### shadcn Components

Button, Input, Badge, Tabs, Dialog, Card, Checkbox, Textarea, Select, Skeleton, Separator, ScrollArea, Tooltip, Avatar

## API Design

### Server Actions

| Action | Auth Required | Purpose |
|---|---|---|
| `toggleSolved(questionId)` | Yes | Toggle solved status for current user. Returns `{ solved: boolean, solvedAt: Date \| null }`. Throws if not authenticated. |
| `saveNotes(questionId, markdown)` | Yes | Save/update markdown notes. Validates max 10,000 chars. Throws if not authenticated or validation fails. |
| `getCompanies()` | No | Returns `{ companies: Company[], totalQuestions: number, totalCompanies: number }`. No pagination — dataset is bounded (~470 companies) and static. |
| `getCompanyQuestions(slug, timePeriod, page, pageSize)` | No | Returns `{ questions: Question[], totalPages: number, currentPage: number }`. Includes user's solved/notes data if authenticated. Page size: 50. |
| `getDashboardStats()` | Yes | Returns `{ totalSolved: number, byDifficulty: { EASY: number, MEDIUM: number, HARD: number }, byCompany: { name: string, solved: number, total: number }[], recentActivity: Question[] }`. Throws if not authenticated. |

### API Routes

- `/api/auth/[...all]` — Better Auth handler
- `/api/search?q=...&page=1&pageSize=20` — Fuzzy search endpoint for debounced client calls. Returns `{ questions: Question[], totalPages: number, currentPage: number }`. Uses pg_trgm `similarity()` function with threshold 0.3.

### Data Flow

1. **Browsing (public):** Server components fetch companies/questions directly via Prisma. User-specific data (solved status) is included if session exists.
2. **Auth actions:** Better Auth handles login/register/session management via `/api/auth/[...all]`.
3. **User actions (authenticated):** Server actions call `auth()` from Better Auth to get session. If no session, throw "Not authenticated" error. Client handles redirect to `/auth/login`.
4. **Search:** Client debounces input → fetches `/api/search?q=...` → pg_trgm similarity query → paginated results.

### Error Handling

All server actions return structured errors:
```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }
```

- **Auth errors**: "Not authenticated" → client redirects to `/auth/login`
- **Validation errors**: "Notes exceed maximum length" → shown inline in UI
- **Not found errors**: "Question not found" → shown as toast notification
- **Database errors**: Logged server-side, generic "Something went wrong" returned to client

API routes return standard HTTP error codes (401, 404, 422, 500) with `{ error: string }` body.

## Loading & Empty States

| Component | Loading State | Empty State |
|---|---|---|
| CompanyGrid | 12 Skeleton cards | "No companies found" |
| QuestionTable | 10 Skeleton rows | "No questions for this time period" |
| SearchResults | 5 Skeleton rows | "No results found for '{query}'" |
| Dashboard Stats | Skeleton cards | "Start solving problems to see your progress!" |
| RecentActivity | 5 Skeleton rows | "No recent activity" |
| CompanyProgress | Skeleton bars | "Solve some problems to track your progress" |

## Auth & Route Protection

### Middleware

Next.js middleware in `middleware.ts` protects authenticated routes:
- `/dashboard` — requires session, redirects to `/auth/login` if missing
- Server actions check `auth()` internally and throw if no session

### Better Auth Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 1 day
  },
});
```

### Client Usage

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const { signIn, signUp, signOut, useSession } = createAuthClient();
```

## CSV Import Script

### Location

`prisma/seed.ts`

### Behavior

1. Scans all company folders in the repo root (skips `frontend/`, `node_modules/`, `.git/`, `docs/`)
2. For each company folder:
   - Creates/updates `Company` record (slugified name)
   - Reads available CSV files: `1. Thirty Days.csv`, `2. Three Months.csv`, `3. Six Months.csv`, `4. More Than Six Months.csv`, `5. All.csv`
   - Maps file name to `TimePeriod` enum
   - **If a CSV file is missing**, logs a warning and skips it (does not fail)
3. For each CSV row:
   - Parses: `Difficulty, Title, Frequency, Acceptance Rate, Link, Topics`
   - **Validates** required fields (title, link, difficulty). Skips invalid rows with a warning log.
   - Upserts `Question` using `@@unique([leetcodeUrl, companyId, timePeriod])`
4. Logs progress: "Processing company 47/470: Apple", "Imported 100 questions from Apple/5. All.csv"
5. **On error**: Logs the error with company/file context, continues processing remaining files. Does not abort the entire import for a single file failure.

### Idempotency

Re-running the script is safe — existing records are updated via upsert, no duplicates created.

### Run Command

```bash
npx prisma db seed
```

Run once during initial setup and whenever CSV data is updated. Not part of the deploy pipeline — data is static after initial import.

Configured in `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="random-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx          # Navbar + auth context
│   │   ├── page.tsx            # Landing page
│   │   ├── companies/
│   │   │   ├── page.tsx        # All companies grid
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Company detail with questions
│   │   ├── search/page.tsx     # Search results
│   │   └── dashboard/page.tsx  # Personal stats
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   └── search/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn components
│   ├── company-card.tsx
│   ├── question-table.tsx
│   ├── question-row.tsx
│   ├── question-detail.tsx
│   ├── note-editor.tsx
│   ├── search-bar.tsx
│   ├── search-results.tsx
│   ├── stats-overview.tsx
│   ├── company-progress.tsx
│   ├── recent-activity.tsx
│   ├── time-period-tabs.tsx
│   ├── difficulty-badge.tsx
│   ├── navbar.tsx
│   └── auth/
│       ├── login-form.tsx
│       └── register-form.tsx
├── lib/
│   ├── auth.ts                 # Better Auth server config
│   ├── auth-client.ts          # Better Auth client
│   ├── db.ts                   # Prisma client singleton
│   └── utils.ts
├── actions/
│   ├── questions.ts            # Server actions for questions
│   └── stats.ts                # Server actions for dashboard
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                 # CSV import script
├── middleware.ts                # Route protection
├── .env
└── package.json
```

## Dependencies to Install

```bash
# Prisma
npm install prisma @prisma/client

# Better Auth
npm install better-auth

# CSV parsing (for seed script)
npm install csv-parse

# Markdown rendering (for notes preview)
npm install react-markdown react-syntax-highlighter
npm install -D @types/react-syntax-highlighter

# Charts (for dashboard)
npm install recharts
```
