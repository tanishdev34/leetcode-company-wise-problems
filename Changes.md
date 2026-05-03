# LeetCode Profile Stats Feature

## Overview

Users link their LeetCode username on the Dashboard. Once linked, the Dashboard shows live stats — solved counts, skill breakdown, contest rating, a submission heatmap (with streak), accepted-only recent solutions, and a daily problem card shown to all users on the home page.

API base: `https://alfa-leetcode-api.onrender.com/`

---

## 1. Schema Change

File: `prisma/schema.prisma`

Add `leetcodeUsername` to the `User` model (nullable):

```prisma
model User {
  // ...existing fields...
  leetcodeUsername String?

  @@map("user")
}
```

After editing, run:

```bash
npx prisma db push
```

---

## 2. Server Action — Save Username

Create file: `actions/profile.ts`

```ts
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveLeetcodeUsername(username: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const trimmed = username.trim();
  if (!trimmed) return { success: false, error: "Username cannot be empty" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { leetcodeUsername: trimmed },
  });

  return { success: true };
}
```

---

## 3. API Proxy Routes

All routes live under `app/api/leetcode/`. Proxy the external API server-side to avoid CORS issues.

### 3a. `app/api/leetcode/stats/route.ts`

Fetches `/solved`, `/contest`, `/skill` in parallel.

```ts
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  try {
    const [solvedRes, contestRes, skillRes] = await Promise.all([
      fetch(`${BASE}/${username}/solved`),
      fetch(`${BASE}/${username}/contest`),
      fetch(`${BASE}/${username}/skill`),
    ]);

    const [solved, contest, skill] = await Promise.all([
      solvedRes.json(),
      contestRes.json(),
      skillRes.json(),
    ]);

    if (solved.errors || contest.errors || skill.errors) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    return NextResponse.json({ solved, contest, skill });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
```

### 3b. `app/api/leetcode/calendar/route.ts`

Fetches `/:username/calendar` — has `streak`, `totalActiveDays`, `activeYears`, and `submissionCalendar`.

**This replaces the old `/profile` proxy for heatmap data.** The `/calendar` endpoint is more accurate and includes streak/active-days metadata that `/profile` does not.

```ts
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/${username}/calendar`);
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    // Return everything — the client needs streak + totalActiveDays for the header stats
    return NextResponse.json({
      activeYears: data.activeYears,         // [2023, 2024, 2025, 2026]
      streak: data.streak,                   // 77
      totalActiveDays: data.totalActiveDays, // 153
      submissionCalendar: data.submissionCalendar, // { "<unix_ts>": count }
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}
```

### 3c. `app/api/leetcode/submissions/route.ts`

Fetches `/:username/acSubmission` — only accepted submissions, clean list with no failed attempts mixed in.

```ts
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/${username}/acSubmission`);
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    return NextResponse.json({
      count: data.count,           // 20 (always 20, it's the last 20 AC submissions)
      submissions: data.submission, // array — note: key is "submission" not "submissions"
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
```

### 3d. `app/api/leetcode/daily/route.ts`

Fetches `/daily` — no username required. Returns today's daily problem.

```ts
import { NextResponse } from "next/server";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${BASE}/daily`, {
      next: { revalidate: 3600 }, // cache for 1 hour — daily problem only changes once a day
    });
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: "Failed to fetch daily problem" }, { status: 500 });
    }

    return NextResponse.json({
      questionLink: data.questionLink,
      date: data.date,                           // "2026-05-03"
      questionTitle: data.questionTitle,
      titleSlug: data.titleSlug,
      difficulty: data.difficulty,               // "Easy" | "Medium" | "Hard"
      isPaidOnly: data.isPaidOnly,
      topicTags: data.topicTags,                 // [{ name, slug }]
      likes: data.likes,
      dislikes: data.dislikes,
      hints: data.hints,                         // string[]
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch daily problem" }, { status: 500 });
  }
}
```

---

## 4. Daily Problem Card on Home Page

File: `app/(main)/page.tsx`

Add a `<DailyProblemCard />` component at the **top of the page** (above the Top Companies section, below the hero stats). This is visible to all users — no login required.

The `page.tsx` is a server component so fetch the daily problem here:

```ts
// Inside the server component, alongside existing prisma queries:
const dailyRes = await fetch(`${process.env.BETTER_AUTH_URL}/api/leetcode/daily`, {
  next: { revalidate: 3600 },
});
const daily = dailyRes.ok ? await dailyRes.json() : null;
```

Then render: `{daily && <DailyProblemCard problem={daily} />}`

---

## 5. Dashboard Page Updates

File: `app/(main)/dashboard/page.tsx`

Server component. Fetch the current user and their saved `leetcodeUsername` from the DB.

- If no `leetcodeUsername` → render a prominent prompt card with `<LeetcodeUsernameForm />`.
- If `leetcodeUsername` is set → render `<LeetcodeStats username={leetcodeUsername} />`, then render `<LeetcodeUsernameForm initialValue={leetcodeUsername} />` collapsed at the bottom (or in a small "Settings" section) so users can change it.

Keep any existing dashboard content (solved question tracking, etc.) above the new section.

---

## 6. Components to Build

All in `components/`. All are `"use client"` unless marked server.

---

### 6a. `components/daily-problem-card.tsx`

**Used on: Home page (visible to everyone)**

Props:
```ts
{
  problem: {
    questionLink: string;
    date: string;            // "2026-05-03"
    questionTitle: string;
    titleSlug: string;
    difficulty: string;      // "Easy" | "Medium" | "Hard"
    isPaidOnly: boolean;
    topicTags: Array<{ name: string; slug: string }>;
    likes: number;
    dislikes: number;
    hints: string[];
  }
}
```

UI (Card, full width):
- Header row: "Daily Challenge" label on the left + today's date on the right
- Problem title as a clickable link to `questionLink` (opens in new tab)
- `<DifficultyBadge difficulty={difficulty} />` (already exists in the codebase at `components/difficulty-badge.tsx`)
- Topic tags as small pills (grey, no interaction needed)
- Likes / dislikes count in muted text: `👍 4912  👎 435`
- If `hints.length > 0`: a collapsed `<details>` element showing hints (CSS only, no JS needed)
- "Solve Now →" button / link that goes to `questionLink`

---

### 6b. `components/leetcode-username-form.tsx`

**Used on: Dashboard**

Props: `{ initialValue?: string }`

- Text input pre-filled with `initialValue`.
- On submit: calls `saveLeetcodeUsername(username)` server action, then `router.refresh()`.
- Inline success ("Saved!") / error state.

UI: Card with title "Link LeetCode Account", input + Save button side by side.

---

### 6c. `components/leetcode-stats.tsx`

**Used on: Dashboard**

Props: `{ username: string }`

Fetches in parallel on mount using `useEffect` + `useState` (no extra libraries):
1. `/api/leetcode/stats?username=X` → `{ solved, contest, skill }`
2. `/api/leetcode/calendar?username=X` → `{ streak, totalActiveDays, submissionCalendar, activeYears }`
3. `/api/leetcode/submissions?username=X` → `{ count, submissions }`

States: loading skeleton → error → data rendered.

Layout once loaded:
```
[streak + activeDays banner — full width]
[SolvedProgressCard]  [ContestCard]
[SubmissionHeatmap    — full width]
[SkillBars            — full width]
[RecentSolvedList     — full width]
```

The streak/active-days banner is just a simple row of two stat pills:
- "🔥 77 day streak"
- "📅 153 active days"

---

### 6d. `components/solved-progress.tsx`

Props:
```ts
{
  solvedProblem: number;   // total solved (from /solved → solvedProblem)
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  // platform totals — hardcode these, they rarely change
  totalEasy: number;    // 941
  totalMedium: number;  // 2050
  totalHard: number;    // 929
}
```

UI:
- Large number showing total solved ("526") centered, with "Solved" label below.
- Three rows (Easy / Medium / Hard):
  - Colored label: Easy = `text-green-400`, Medium = `text-yellow-400`, Hard = `text-red-400`
  - `solved / total` text right-aligned
  - Thin progress bar below: `width = (solved / total) * 100%`

---

### 6e. `components/contest-stats.tsx`

Props:
```ts
{
  contestAttend: number;
  contestRating: number;
  contestGlobalRanking: number;
  totalParticipants: number;
  contestTopPercentage: number;
  contestParticipation: Array<{
    attended: boolean;
    rating: number;
    ranking: number;
    trendDirection: "UP" | "DOWN";
    problemsSolved: number;
    totalProblems: number;
    finishTimeInSeconds: number;
    contest: { title: string; startTime: number };
  }>;
}
```

UI:
- Large rating number ("1708") with "Contest Rating" label
- "Top 12.72%" badge
- `N contests attended`
- List of `contestParticipation` entries (most recent first):
  - Contest title
  - Date from `startTime` unix timestamp
  - `3 / 4 solved`
  - Ranking: `#1054`
  - Rating change with colored arrow: ↑ UP (green) / ↓ DOWN (red)
  - Finish time: convert `finishTimeInSeconds` to `mm:ss` or `Xh Ym`

---

### 6f. `components/skill-bars.tsx`

Props:
```ts
{
  fundamental: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  intermediate: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  advanced: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
}
```

UI:
- Three column sections side by side (stack on mobile): "Fundamental" | "Intermediate" | "Advanced"
- Each section: top 8 skills sorted by `problemsSolved` descending
- Each skill row: tag name | count (right) | bar below spanning full row width
- Bar fill = `(problemsSolved / maxInSection) * 100%`
- Bar colors: Fundamental = `bg-blue-500`, Intermediate = `bg-purple-500`, Advanced = `bg-orange-500`

---

### 6g. `components/submission-heatmap.tsx`

Props:
```ts
{
  submissionCalendar: Record<string, number>; // { "<unix_seconds_string>": count }
  streak: number;
  totalActiveDays: number;
}
```

**How to build the grid:**
1. Convert keys: `new Date(parseInt(key) * 1000)` → format as `YYYY-MM-DD`
2. Build a `Map<string, number>` of `dateStr → count`
3. Render the last 52 weeks as a 7-row × 52-column CSS grid (Sunday = row 0)
4. Each cell is a `12×12px` square with `rounded-sm` and a `title="YYYY-MM-DD: N submissions"` tooltip

Cell color by count:
- 0 → `bg-muted`
- 1–2 → `bg-green-900`
- 3–5 → `bg-green-700`
- 6–9 → `bg-green-500`
- 10+ → `bg-green-300`

Show abbreviated month labels above the columns (Jan, Feb, …).

No external library — pure Tailwind CSS grid.

---

### 6h. `components/recent-solved-list.tsx`

**Note: Uses `/acSubmission` — only accepted submissions, no failed attempts.**

Props:
```ts
{
  submissions: Array<{
    title: string;
    titleSlug: string;
    timestamp: string;   // unix seconds as string — convert with parseInt(ts) * 1000
    statusDisplay: string; // will always be "Accepted" from this endpoint
    lang: string;         // "cpp" | "python3" | "java" | etc.
  }>;
  count: number; // always 20
}
```

UI:
- Title: "Recently Solved" (not "Recent Submissions" — these are all accepted)
- List of up to 20 entries:
  - Green "Accepted" badge (static, no need to branch on status since all are AC)
  - Problem title linking to `https://leetcode.com/problems/<titleSlug>/` (new tab)
  - Language pill (e.g. "C++", "Python" — map `lang` to display name)
  - Time ago from timestamp (e.g. "2 hours ago", "3 days ago")

Language display map:
```ts
const LANG_DISPLAY: Record<string, string> = {
  cpp: "C++", python3: "Python", java: "Java", javascript: "JS",
  typescript: "TS", rust: "Rust", go: "Go", kotlin: "Kotlin",
  swift: "Swift", c: "C", csharp: "C#",
};
```

---

## 7. Data Flow Summary

```
Home page (server)
  → fetches /api/leetcode/daily (cached 1h)
  → renders <DailyProblemCard />

Dashboard (server)
  → reads user.leetcodeUsername from DB
  → no username: renders <LeetcodeUsernameForm /> prompt
  → username set: renders <LeetcodeStats username={...} />

LeetcodeStats (client, useEffect)
  → parallel fetch:
      /api/leetcode/stats?username=X       → solved + contest + skill
      /api/leetcode/calendar?username=X    → streak + totalActiveDays + submissionCalendar
      /api/leetcode/submissions?username=X → last 20 accepted only

Proxy routes (Next.js API, server)
  → /api/leetcode/stats       → alfa-leetcode-api /:u/solved + /:u/contest + /:u/skill
  → /api/leetcode/calendar    → alfa-leetcode-api /:u/calendar
  → /api/leetcode/submissions → alfa-leetcode-api /:u/acSubmission
  → /api/leetcode/daily       → alfa-leetcode-api /daily (revalidate: 3600)
```

---

## 8. Exact API Response Shapes (verified by testing against username "Killusplease")

### `/:username/solved`
```json
{
  "solvedProblem": 526,
  "easySolved": 149,
  "mediumSolved": 318,
  "hardSolved": 59,
  "totalSubmissionNum": [
    { "difficulty": "All", "count": 530, "submissions": 1260 },
    { "difficulty": "Easy", "count": 149, "submissions": 336 },
    { "difficulty": "Medium", "count": 320, "submissions": 784 },
    { "difficulty": "Hard", "count": 61, "submissions": 140 }
  ],
  "acSubmissionNum": [
    { "difficulty": "All", "count": 526, "submissions": 906 },
    { "difficulty": "Easy", "count": 149, "submissions": 262 },
    { "difficulty": "Medium", "count": 318, "submissions": 560 },
    { "difficulty": "Hard", "count": 59, "submissions": 84 }
  ]
}
```

### `/:username/calendar`
```json
{
  "activeYears": [2023, 2024, 2025, 2026],
  "streak": 77,
  "totalActiveDays": 153,
  "submissionCalendar": {
    "1746316800": 5,
    "1746403200": 2,
    "1753574400": 16
  }
}
```
**Key insight:** `submissionCalendar` timestamps are Unix seconds (not ms). The most submissions in a day from this user was 16.

### `/:username/acSubmission`
```json
{
  "count": 20,
  "submission": [
    {
      "title": "Minimum Cost to Move Between Indices",
      "titleSlug": "minimum-cost-to-move-between-indices",
      "timestamp": "1777777559",
      "statusDisplay": "Accepted",
      "lang": "cpp"
    }
  ]
}
```
**Note:** The array key is `submission` (singular), not `submissions`. The proxy route in 3c renames it to `submissions` for clarity.

### `/:username/skill`
```json
{
  "fundamental": [
    { "tagName": "Array", "tagSlug": "array", "problemsSolved": 289 },
    { "tagName": "String", "tagSlug": "string", "problemsSolved": 122 },
    { "tagName": "Sorting", "tagSlug": "sorting", "problemsSolved": 70 },
    { "tagName": "Two Pointers", "tagSlug": "two-pointers", "problemsSolved": 55 }
  ],
  "intermediate": [
    { "tagName": "Hash Table", "tagSlug": "hash-table", "problemsSolved": 98 },
    { "tagName": "Greedy", "tagSlug": "greedy", "problemsSolved": 77 },
    { "tagName": "Math", "tagSlug": "math", "problemsSolved": 92 },
    { "tagName": "Dynamic Programming", "tagSlug": "dynamic-programming", "problemsSolved": 95 }
  ],
  "advanced": [
    { "tagName": "Dynamic Programming", "tagSlug": "dynamic-programming", "problemsSolved": 95 },
    { "tagName": "Backtracking", "tagSlug": "backtracking", "problemsSolved": 15 },
    { "tagName": "Union-Find", "tagSlug": "union-find", "problemsSolved": 15 }
  ]
}
```

### `/:username/contest`
```json
{
  "contestAttend": 2,
  "contestRating": 1708.6456700375206,
  "contestGlobalRanking": 109000,
  "totalParticipants": 874510,
  "contestTopPercentage": 12.72,
  "contestBadges": null,
  "contestParticipation": [
    {
      "attended": true,
      "rating": 1675.733,
      "ranking": 1054,
      "trendDirection": "UP",
      "problemsSolved": 3,
      "totalProblems": 4,
      "finishTimeInSeconds": 1537,
      "contest": {
        "title": "Biweekly Contest 181",
        "startTime": 1777127400
      }
    },
    {
      "attended": true,
      "rating": 1708.646,
      "ranking": 4906,
      "trendDirection": "UP",
      "problemsSolved": 3,
      "totalProblems": 4,
      "finishTimeInSeconds": 3535,
      "contest": {
        "title": "Weekly Contest 499",
        "startTime": 1777170600
      }
    }
  ]
}
```

### `/daily`
```json
{
  "questionLink": "https://leetcode.com/problems/rotate-string/",
  "date": "2026-05-03",
  "questionId": "812",
  "questionFrontendId": "796",
  "questionTitle": "Rotate String",
  "titleSlug": "rotate-string",
  "difficulty": "Easy",
  "isPaidOnly": false,
  "topicTags": [
    { "name": "String", "slug": "string", "translatedName": null },
    { "name": "String Matching", "slug": "string-matching", "translatedName": null }
  ],
  "hints": [],
  "likes": 4912,
  "dislikes": 435,
  "solution": { "id": "2552", "canSeeDetail": true, "paidOnly": false }
}
```

---

## 9. Styling Notes

- Match the existing dark theme — Tailwind dark background, muted borders.
- Use `Card` from `@/components/ui/card` as wrapper for each stat block.
- Use `DifficultyBadge` from `components/difficulty-badge.tsx` (already exists) for difficulty display.
- Loading: `animate-pulse bg-muted rounded` skeleton placeholders matching each card's shape.
- Error state: card with `XCircle` icon + message + "Retry" button that re-runs the fetch.
- The streak and active days banner should use a warm amber/orange for the flame feel.

---

## 10. Files to Create / Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `leetcodeUsername String?` to User |
| `actions/profile.ts` | New — `saveLeetcodeUsername` server action |
| `app/api/leetcode/stats/route.ts` | New — proxy: solved + contest + skill |
| `app/api/leetcode/calendar/route.ts` | New — proxy: streak + heatmap data |
| `app/api/leetcode/submissions/route.ts` | New — proxy: last 20 accepted only |
| `app/api/leetcode/daily/route.ts` | New — proxy: today's daily problem (cached 1h) |
| `app/(main)/page.tsx` | Update — add `<DailyProblemCard />` after hero section |
| `app/(main)/dashboard/page.tsx` | Update — username form + stats section |
| `components/daily-problem-card.tsx` | New — daily challenge card for home page |
| `components/leetcode-username-form.tsx` | New — save/update username form |
| `components/leetcode-stats.tsx` | New — client container, fetches all 3 endpoints |
| `components/solved-progress.tsx` | New — easy/medium/hard progress bars |
| `components/contest-stats.tsx` | New — contest rating + history |
| `components/submission-heatmap.tsx` | New — GitHub-style 52-week calendar grid |
| `components/skill-bars.tsx` | New — topic bars in 3 categories |
| `components/recent-solved-list.tsx` | New — last 20 accepted submissions |
