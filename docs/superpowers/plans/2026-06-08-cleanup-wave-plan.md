# June 2026 Cleanup Wave Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Roadmap Planner, GraphQL Sync, and macOS UI Redesign in sequence.

**Architecture:** Three phases — Roadmap adds new Prisma models + generation engine. GraphQL replaces alfa-leetcode-api with direct LeetCode calls. macOS UI restructures navigation into sidebar + Today/Library/Coach surfaces.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, React 19, Tailwind CSS v4, shadcn/ui, React Flow, Recharts

---

## Phase 1: Roadmap Planner

### Task 1.1: Prisma Schema — Roadmap Models

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/db.ts` (if needed for generated client)

- [ ] **Step 1: Add Roadmap model to schema**

Add after `StudyPlanItem` model:

```prisma
model Roadmap {
  id                String         @id @default(cuid())
  userId            String
  name              String
  status            String         @default("active") // active | paused | completed | archived
  goalType          String         @default("company") // company | topic | mixed | custom
  companyId         String?
  topicSlug         String?
  startDate         DateTime
  endDate           DateTime
  dailyQuestionTarget Int          @default(3)
  studyDays         Int[]          @default([1,2,3,4,5]) // 0-6, Mon-Fri default
  strategy          String         @default("balanced") // balanced | frequency | weak_topic | sprint
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  user              User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  company           Company?       @relation(fields: [companyId], references: [id])
  items             RoadmapItem[]
  events            RoadmapEvent[]

  @@index([userId])
  @@index([userId, status])
  @@map("roadmap")
}

model RoadmapItem {
  id            String    @id @default(cuid())
  roadmapId     String
  questionId    String
  plannedDate   DateTime
  sortOrder     Int       @default(0)
  status        String    @default("planned") // planned | in_progress | completed | skipped | moved
  sourceReason  String?   // company-frequency | weak-topic | review-due | difficulty-balance
  locked        Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  roadmap       Roadmap   @relation(fields: [roadmapId], references: [id], onDelete: Cascade)
  question      Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([roadmapId])
  @@index([questionId])
  @@index([roadmapId, plannedDate])
  @@map("roadmap_item")
}

model RoadmapEvent {
  id        String   @id @default(cuid())
  roadmapId String
  type      String   // created | rebalanced | paused | resumed | item_completed | item_moved | sync_matched
  payload   Json?
  createdAt DateTime @default(now())
  roadmap   Roadmap  @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  @@index([roadmapId])
  @@map("roadmap_event")
}
```

- [ ] **Step 2: Update User model relations**

Add to User model:
```prisma
roadmaps Roadmap[]
```

- [ ] **Step 3: Update Question model relations**

Add to Question model:
```prisma
roadmapItems RoadmapItem[]
```

- [ ] **Step 4: Run migration**

```bash
bunx prisma migrate dev --name add-roadmap-models
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Roadmap, RoadmapItem, RoadmapEvent models"
```

---

### Task 1.2: Roadmap Generation Engine

**Files:**
- Create: `lib/roadmap-generator.ts`
- Create: `actions/roadmaps.ts`

- [ ] **Step 1: Create roadmap generator library**

```typescript
// lib/roadmap-generator.ts
import { prisma } from "./db"

interface RoadmapInput {
  userId: string
  goalType: "company" | "topic" | "mixed" | "custom"
  companyId?: string
  topicSlug?: string
  startDate: Date
  endDate: Date
  dailyQuestionTarget: number
  studyDays: number[] // 0-6
  strategy: "balanced" | "frequency" | "weak_topic" | "sprint"
}

interface GeneratedItem {
  questionId: string
  plannedDate: Date
  sortOrder: number
  sourceReason: string
}

export async function generateRoadmapItems(input: RoadmapInput): Promise<GeneratedItem[]> {
  const { userId, goalType, companyId, topicSlug, startDate, endDate, dailyQuestionTarget, studyDays, strategy } = input

  // 1. Get solved question IDs for this user
  const solvedQuestions = await prisma.userQuestion.findMany({
    where: { userId, solved: true },
    select: { questionId: true },
  })
  const solvedIds = new Set(solvedQuestions.map((q) => q.questionId))

  // 2. Get candidate questions based on goal type
  let candidates: { id: string; difficulty: string; topics: string[]; frequency: number }[] = []

  if (goalType === "company" && companyId) {
    const cqs = await prisma.companyQuestion.findMany({
      where: { companyId, timePeriod: "ALL" },
      include: { question: { select: { id: true, difficulty: true, topics: true } } },
      orderBy: { frequency: "desc" },
    })
    candidates = cqs
      .filter((cq) => !solvedIds.has(cq.questionId))
      .map((cq) => ({
        id: cq.questionId,
        difficulty: cq.question.difficulty,
        topics: cq.question.topics,
        frequency: cq.frequency,
      }))
  } else if (goalType === "topic" && topicSlug) {
    const questions = await prisma.question.findMany({
      where: { topics: { has: topicSlug }, id: { notIn: Array.from(solvedIds) } },
      select: { id: true, difficulty: true, topics: true },
    })
    candidates = questions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      topics: q.topics,
      frequency: 50,
    }))
  }

  // 3. Sort by strategy
  if (strategy === "frequency") {
    candidates.sort((a, b) => b.frequency - a.frequency)
  } else if (strategy === "weak_topic") {
    // Prioritize topics with fewer solved questions
    const topicSolvedCounts = new Map<string, number>()
    for (const q of candidates) {
      for (const t of q.topics) {
        topicSolvedCounts.set(t, (topicSolvedCounts.get(t) || 0) + (solvedIds.has(q.id) ? 1 : 0))
      }
    }
    candidates.sort((a, b) => {
      const aScore = a.topics.reduce((sum, t) => sum + (topicSolvedCounts.get(t) || 0), 0)
      const bScore = b.topics.reduce((sum, t) => sum + (topicSolvedCounts.get(t) || 0), 0)
      return aScore - bScore
    })
  } else if (strategy === "sprint") {
    // Prioritize hard questions
    const diffOrder = { HARD: 0, MEDIUM: 1, EASY: 2 }
    candidates.sort((a, b) => (diffOrder[a.difficulty as keyof typeof diffOrder] ?? 2) - (diffOrder[b.difficulty as keyof typeof diffOrder] ?? 2))
  }

  // 4. Generate study days
  const studyDaySet = new Set(studyDays)
  const studyDates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    if (studyDaySet.has(current.getDay())) {
      studyDate.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  // 5. Distribute questions across days
  const items: GeneratedItem[] = []
  let candidateIdx = 0
  for (const date of studyDates) {
    for (let i = 0; i < dailyQuestionTarget && candidateIdx < candidates.length; i++) {
      const candidate = candidates[candidateIdx]
      let reason = "company-frequency"
      if (strategy === "weak_topic") reason = "weak-topic"
      else if (strategy === "sprint") reason = "difficulty-balance"

      items.push({
        questionId: candidate.id,
        plannedDate: date,
        sortOrder: i,
        sourceReason: reason,
      })
      candidateIdx++
    }
  }

  return items
}
```

- [ ] **Step 2: Create server actions**

```typescript
// actions/roadmaps.ts
"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { generateRoadmapItems } from "@/lib/roadmap-generator"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createRoadmap(input: {
  name: string
  goalType: string
  companyId?: string
  topicSlug?: string
  startDate: string
  endDate: string
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.create({
      data: {
        userId: session.user.id,
        name: input.name,
        goalType: input.goalType,
        companyId: input.companyId || null,
        topicSlug: input.topicSlug || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        dailyQuestionTarget: input.dailyQuestionTarget,
        studyDays: input.studyDays,
        strategy: input.strategy,
      },
    })

    // Generate items
    const items = await generateRoadmapItems({
      userId: session.user.id,
      ...input,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    })

    if (items.length > 0) {
      await prisma.roadmapItem.createMany({
        data: items.map((item) => ({
          roadmapId: roadmap.id,
          questionId: item.questionId,
          plannedDate: item.plannedDate,
          sortOrder: item.sortOrder,
          sourceReason: item.sourceReason,
        })),
      })
    }

    // Log event
    await prisma.roadmapEvent.create({
      data: {
        roadmapId: roadmap.id,
        type: "created",
        payload: { itemCount: items.length, strategy: input.strategy },
      },
    })

    return { success: true, data: { id: roadmap.id } }
  } catch (e) {
    console.error("createRoadmap error:", e)
    return { success: false, error: "Failed to create roadmap" }
  }
}

export async function getRoadmaps(): Promise<ActionResult<{ roadmaps: any[] }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmaps = await prisma.roadmap.findMany({
      where: { userId: session.user.id, status: { not: "archived" } },
      include: {
        _count: { select: { items: true } },
        items: {
          where: { status: "completed" },
          select: { id: true },
        },
        company: { select: { name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return {
      success: true,
      data: {
        roadmaps: roadmaps.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          goalType: r.goalType,
          companyName: r.company?.name,
          startDate: r.startDate,
          endDate: r.endDate,
          totalItems: r._count.items,
          completedItems: r.items.length,
          dailyQuestionTarget: r.dailyQuestionTarget,
        })),
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch roadmaps" }
  }
}

export async function getRoadmapDetail(roadmapId: string): Promise<ActionResult<any>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      include: {
        company: { select: { name: true, slug: true } },
        items: {
          include: {
            question: {
              select: { id: true, title: true, leetcodeUrl: true, difficulty: true, topics: true },
            },
          },
          orderBy: [{ plannedDate: "asc" }, { sortOrder: "asc" }],
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!roadmap) return { success: false, error: "Roadmap not found" }

    return { success: true, data: roadmap }
  } catch {
    return { success: false, error: "Failed to fetch roadmap detail" }
  }
}

export async function completeRoadmapItem(itemId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const item = await prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { userId: session.user.id } },
    })
    if (!item) return { success: false, error: "Item not found" }

    await prisma.roadmapItem.update({
      where: { id: itemId },
      data: { status: "completed" },
    })

    // Also mark the question as solved
    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId: item.questionId } },
      update: { solved: true, solvedAt: new Date() },
      create: { userId: session.user.id, questionId: item.questionId, solved: true, solvedAt: new Date() },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to complete item" }
  }
}

export async function moveRoadmapItem(itemId: string, newDate: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const item = await prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { userId: session.user.id } },
    })
    if (!item) return { success: false, error: "Item not found" }

    await prisma.roadmapItem.update({
      where: { id: itemId },
      data: { plannedDate: new Date(newDate), status: "moved" },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to move item" }
  }
}

export async function rebalanceRoadmap(roadmapId: string): Promise<ActionResult<{ moved: number }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      include: {
        items: {
          where: { status: { in: ["planned", "moved"] }, locked: false },
          orderBy: { plannedDate: "asc" },
        },
      },
    })
    if (!roadmap) return { success: false, error: "Roadmap not found" }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Find overdue items (planned before today, not completed)
    const overdueItems = roadmap.items.filter(
      (item) => new Date(item.plannedDate) < now && item.status !== "completed"
    )

    if (overdueItems.length === 0) {
      return { success: true, data: { moved: 0 } }
    }

    // Find available future study days
    const studyDaySet = new Set(roadmap.studyDays)
    const futureDates: Date[] = []
    const cursor = new Date(now)
    cursor.setDate(cursor.getDate() + 1)
    const endDate = new Date(roadmap.endDate)
    while (cursor <= endDate) {
      if (studyDaySet.has(cursor.getDay())) {
        futureDates.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // Distribute overdue items across future days
    let moved = 0
    let dateIdx = 0
    for (const item of overdueItems) {
      if (dateIdx >= futureDates.length) break
      await prisma.roadmapItem.update({
        where: { id: item.id },
        data: { plannedDate: futureDates[dateIdx], status: "moved" },
      })
      moved++
      // Move to next day after filling current day's capacity
      if ((moved % roadmap.dailyQuestionTarget) === 0) {
        dateIdx++
      }
    }

    await prisma.roadmapEvent.create({
      data: {
        roadmapId,
        type: "rebalanced",
        payload: { movedCount: moved },
      },
    })

    return { success: true, data: { moved } }
  } catch {
    return { success: false, error: "Failed to rebalance roadmap" }
  }
}

export async function updateRoadmapStatus(roadmapId: string, status: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    await prisma.roadmap.update({
      where: { id: roadmapId, userId: session.user.id },
      data: { status },
    })

    await prisma.roadmapEvent.create({
      data: { roadmapId, type: status === "paused" ? "paused" : "resumed" },
    })

    return { success: true, data: { success: true } }
  } catch {
    return { success: false, error: "Failed to update roadmap status" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/roadmap-generator.ts actions/roadmaps.ts
git commit -m "feat: roadmap generation engine and server actions"
```

---

### Task 1.3: Roadmap UI Components

**Files:**
- Create: `components/roadmap-view.tsx`
- Create: `components/roadmap-create-dialog.tsx`
- Create: `app/(main)/roadmaps/page.tsx`
- Modify: `middleware.ts` — add `/roadmaps` to protected routes
- Modify: `components/navbar.tsx` — add Roadmaps link
- Modify: `components/command-palette.tsx` — add Roadmaps entry

- [ ] **Step 1: Create roadmap page**

```tsx
// app/(main)/roadmaps/page.tsx
import { RoadmapView } from "@/components/roadmap-view"

export const metadata = {
  title: "Roadmaps — LC Tracker",
  description: "Study roadmaps for interview preparation",
}

export default function RoadmapsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <RoadmapView />
    </div>
  )
}
```

- [ ] **Step 2: Create RoadmapView component**

Create `components/roadmap-view.tsx` — the main three-pane layout:
- Left: roadmap list with create button
- Center: calendar/timeline with daily question batches
- Right: selected day/question inspector

Uses `getRoadmaps()`, `getRoadmapDetail()`, `completeRoadmapItem()`, `moveRoadmapItem()`, `rebalanceRoadmap()`.

- [ ] **Step 3: Create RoadmapCreateDialog component**

Create `components/roadmap-create-dialog.tsx` — multi-step dialog:
1. Goal (company/topic/custom)
2. Deadline (start/end dates, days per week, questions per day)
3. Strategy (balanced/frequency/weak_topic/sprint)
4. Preview

Uses `createRoadmap()`.

- [ ] **Step 4: Update middleware**

Add `/roadmaps` to PROTECTED_ROUTES and matcher.

- [ ] **Step 5: Update navbar**

Add Roadmaps to PRIMARY_LINKS or MORE_LINKS.

- [ ] **Step 6: Update command palette**

Add "Roadmaps" entry.

- [ ] **Step 7: Commit**

```bash
git add components/roadmap-view.tsx components/roadmap-create-dialog.tsx app/(main)/roadmaps/page.tsx middleware.ts components/navbar.tsx components/command-palette.tsx
git commit -m "feat: roadmap UI with three-pane layout and create dialog"
```

---

## Phase 2: GraphQL Sync

### Task 2.1: Prisma Schema — titleSlug and SyncRun

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add titleSlug to Question**

Add to Question model:
```prisma
titleSlug String? @unique
```

- [ ] **Step 2: Add SyncRun model**

```prisma
model SyncRun {
  id            String    @id @default(cuid())
  userId        String
  provider      String    @default("leetcode")
  status        String    @default("pending") // pending | running | done | error
  startedAt     DateTime  @default(now())
  finishedAt    DateTime?
  matchedCount  Int       @default(0)
  importedCount Int       @default(0)
  skippedCount  Int       @default(0)
  error         String?
  metadata      Json?
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, startedAt])
  @@map("sync_run")
}
```

- [ ] **Step 3: Add SyncRun relation to User**

Add to User model:
```prisma
syncRuns SyncRun[]
```

- [ ] **Step 4: Run migration**

```bash
bunx prisma migrate dev --name add-title-slug-and-sync-run
```

- [ ] **Step 5: Backfill titleSlug from leetcodeUrl**

Write a script to extract titleSlug from existing leetcodeUrl values.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Question.titleSlug and SyncRun model"
```

---

### Task 2.2: LeetCode GraphQL Client

**Files:**
- Create: `lib/leetcode-graphql.ts`

- [ ] **Step 1: Create GraphQL client**

```typescript
// lib/leetcode-graphql.ts
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

async function graphqlQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) throw new Error(`LeetCode GraphQL ${res.status}`)

  const json: GraphQLResponse<T> = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  if (!json.data) throw new Error("No data returned")

  return json.data
}

export interface RecentSubmission {
  id: string
  title: string
  titleSlug: string
  timestamp: string
}

export async function fetchRecentAcSubmissions(username: string, limit = 100): Promise<RecentSubmission[]> {
  const data = await graphqlQuery<{
    recentAcSubmissionList: RecentSubmission[]
  }>(
    `query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }`,
    { username, limit }
  )
  return data.recentAcSubmissionList
}

export interface QuestionDetails {
  questionId: string
  questionFrontendId: string
  title: string
  titleSlug: string
  difficulty: string
  acRate: number
  isPaidOnly: boolean
  topicTags: Array<{ name: string; slug: string }>
}

export async function fetchQuestionDetails(titleSlug: string): Promise<QuestionDetails | null> {
  try {
    const data = await graphqlQuery<{ question: QuestionDetails | null }>(
      `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
          acRate
          isPaidOnly
          topicTags {
            name
            slug
          }
        }
      }`,
      { titleSlug }
    )
    return data.question
  } catch {
    return null
  }
}

export interface UserProgress {
  allQuestionsCount: Array<{ difficulty: string; count: number }>
  matchedUser: {
    submitStats: {
      acSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>
    }
  } | null
}

export async function fetchUserProgress(username: string): Promise<UserProgress> {
  return graphqlQuery<UserProgress>(
    `query userSessionProgress($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }`,
    { username }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/leetcode-graphql.ts
git commit -m "feat: LeetCode GraphQL client for sync and question hydration"
```

---

### Task 2.3: Replace Sync Route

**Files:**
- Modify: `app/api/sync/route.ts`

- [ ] **Step 1: Rewrite sync route to use GraphQL**

Replace `alfa-leetcode-api` calls with `fetchRecentAcSubmissions()` and `fetchQuestionDetails()` from `lib/leetcode-graphql.ts`. Key changes:
- Create SyncRun record at start
- Use GraphQL for recent submissions
- Hydrate missing questions via GraphQL
- Update SyncRun record at end
- Still create ReviewItems for newly solved questions

- [ ] **Step 2: Update leetcode-stats.tsx**

Update the sync button handler to show SyncRun summary (matched, imported, skipped).

- [ ] **Step 3: Commit**

```bash
git add app/api/sync/route.ts components/leetcode-stats.tsx
git commit -m "feat: replace alfa-leetcode-api sync with direct LeetCode GraphQL"
```

---

### Task 2.4: Update Remaining alfa-leetcode-api Calls

**Files:**
- Modify: `app/api/leetcode/stats/route.ts`
- Modify: `app/api/leetcode/calendar/route.ts`
- Modify: `app/api/leetcode/daily/route.ts`
- Modify: `app/api/leetcode/submissions/route.ts`
- Modify: `app/(main)/page.tsx`
- Modify: `app/api/cron/daily/route.ts`

- [ ] **Step 1: Keep alfa-leetcode-api for stats/calendar/daily/submissions**

These endpoints (stats, calendar, daily, submissions) are read-only display data that doesn't need to be real-time. Keep using alfa-leetcode-api with heavy caching (24h TTL). The user's requirement is "strictly reduced usage" — these are already cached and rarely called.

- [ ] **Step 2: Remove alfa-leetcode-api from sync only**

The sync route is the only place that should use GraphQL directly. All other endpoints keep alfa with cache.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: note that alfa-leetcode-api remains for display endpoints with 24h cache"
```

---

## Phase 3: macOS UI Redesign

### Task 3.1: New App Shell — Sidebar Layout

**Files:**
- Create: `components/app-shell.tsx`
- Create: `components/sidebar-nav.tsx`
- Modify: `app/(main)/layout.tsx`

- [ ] **Step 1: Create AppShell component**

Fixed sidebar with: Today, Roadmaps, Library, Coach, Settings. Collapse to icon-only on mobile. Active indicator, badges for due reviews.

- [ ] **Step 2: Create SidebarNav component**

Navigation items with icons, active state, badges. Secondary items (Admin, System Map) collapsed at bottom.

- [ ] **Step 3: Update main layout**

Replace current layout with sidebar + content area. Remove old navbar from authenticated pages.

- [ ] **Step 4: Commit**

```bash
git add components/app-shell.tsx components/sidebar-nav.tsx app/(main)/layout.tsx
git commit -m "feat: new app shell with sidebar navigation"
```

---

### Task 3.2: Today Page

**Files:**
- Create: `components/today-view.tsx`
- Modify: `app/(main)/dashboard/page.tsx` (rename to today or redirect)

- [ ] **Step 1: Create TodayView component**

Sections: active roadmap progress, today's questions, due reviews, last solved streak, sync status, coaching insight.

- [ ] **Step 2: Update dashboard page**

Replace current dashboard with Today view, or create `/today` and redirect `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add components/today-view.tsx app/(main)/dashboard/page.tsx
git commit -m "feat: Today page replacing dashboard"
```

---

### Task 3.3: Library Page

**Files:**
- Create: `components/library-view.tsx`
- Create: `app/(main)/library/page.tsx`

- [ ] **Step 1: Create LibraryView component**

Modes: Questions table, Companies table, Topics table, Notes search. Filters: company, topic, difficulty, solved status, review due, in roadmap, has solution, has notes.

- [ ] **Step 2: Create library page**

- [ ] **Step 3: Commit**

```bash
git add components/library-view.tsx app/(main)/library/page.tsx
git commit -m "feat: Library page unifying questions, companies, topics, notes"
```

---

### Task 3.4: Coach Page Consolidation

**Files:**
- Modify: `app/(main)/coach/page.tsx`
- Modify: `app/(main)/memory/page.tsx` (redirect to coach)
- Modify: `app/(main)/reviews/page.tsx` (redirect to coach or today)

- [ ] **Step 1: Merge mistake memory into Coach**

Add "Patterns" section to Coach page with mistake memory data.

- [ ] **Step 2: Merge reviews into Today/Coach**

Reviews show in Today due queue and Coach review section.

- [ ] **Step 3: Redirect old routes**

/memory → /coach, /reviews → /today or /coach

- [ ] **Step 4: Commit**

```bash
git add app/(main)/coach/page.tsx app/(main)/memory/page.tsx app/(main)/reviews/page.tsx
git commit -m "feat: consolidate Coach, Memory, Reviews into unified surfaces"
```

---

### Task 3.5: Route Cleanup

**Files:**
- Modify: `middleware.ts`
- Modify: `components/navbar.tsx`
- Modify: `components/command-palette.tsx`
- Remove: various orphaned routes/components

- [ ] **Step 1: Update middleware**

New protected routes: `/today`, `/roadmaps`, `/library`, `/coach`, `/settings`. Keep old routes for backward compat with redirects.

- [ ] **Step 2: Remove old navbar**

Replace with sidebar navigation.

- [ ] **Step 3: Update command palette**

New entries: Today, Roadmaps, Library, Coach, Settings.

- [ ] **Step 4: Remove orphaned routes**

/stats → Library inspector, /readiness → Roadmap detail, /learning → Library graph mode, /memory → Coach, /reports → Today recap, /playground → Question detail, /whiteboard → Interview attachment, /planner → /roadmaps

- [ ] **Step 5: Commit**

```bash
git add middleware.ts components/navbar.tsx components/command-palette.tsx
git commit -m "feat: route cleanup — consolidate to Today/Roadmaps/Library/Coach"
```

---

### Task 3.6: Wiki Updates

- [ ] **Step 1: Update all wiki pages**

Update architecture.md, data-model.md, pages.md, components.md, actions.md, configuration.md, conventions.md to reflect all changes.

- [ ] **Step 2: Commit**

```bash
git add docs/wiki/
git commit -m "docs: update wiki for June 2026 cleanup wave"
```
