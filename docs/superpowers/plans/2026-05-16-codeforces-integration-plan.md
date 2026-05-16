# Codeforces Integration + Dashboard Reorganization + Extension Enhancement Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Codeforces profile integration, reorganize dashboard into `/stats` + lean dashboard, and enhance the browser extension with LeetCode stats, quotes, and animations.

**Architecture:** Following existing patterns — Prisma schema change for `codeforcesUsername`, server actions for CF username, API proxy routes to Codeforces API (cached via Redis), new `/codeforces` and `/stats` pages, enhanced extension popup.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Better Auth, Redis (Upstash), Recharts (for rating chart), WXT + React + Tailwind (extension)

---

## File Inventory

### Files to Create:
| File | Responsibility |
|------|----------------|
| `actions/codeforces.ts` | Server action: `saveCodeforcesUsername` |
| `components/codeforces-username-form.tsx` | Form to set/change CF handle |
| `components/codeforces-profile.tsx` | Client component — fetches CF data, renders card + chart + table |
| `components/codeforces-user-card.tsx` | Avatar, handle, rating, rank, contribution |
| `components/rating-history-chart.tsx` | Recharts line chart of rating over time, colored by rank |
| `components/contest-history-table.tsx` | Table of contest results with rating delta |
| `app/api/codeforces/user/route.ts` | Proxy to CF `user.info` API |
| `app/api/codeforces/rating/route.ts` | Proxy to CF `user.rating` API |
| `app/api/user/profile/route.ts` | Returns full user profile (email, leetcodeUsername, codeforcesUsername) |
| `app/(main)/codeforces/page.tsx` | Codeforces profile page (auth required) |
| `app/(main)/stats/page.tsx` | LeetCode full stats page (auth required) |

### Files to Modify:
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `codeforcesUsername String?` to User model |
| `components/navbar.tsx` | Add "Stats" and "Codeforces" nav links (authenticated) |
| `middleware.ts` | Add `/stats` and `/codeforces` to `PROTECTED_ROUTES` and `matcher` |
| `app/(main)/dashboard/page.tsx` | Remove LeetCodeStats, keep lean, add links to /stats and /codeforces |
| `leetcode-extension/entrypoints/background.ts` | Add `GET_USER_PROFILE`, `GET_LEETCODE_STATS` message handlers |
| `leetcode-extension/entrypoints/popup/App.tsx` | Redesign main view: LC stats, quotes, animations |
| `leetcode-extension/entrypoints/popup/style.css` | Add animation keyframes |

---

## Chunk 1: Backend — Schema, Actions, API Routes

### Task 1.1: Add codeforcesUsername to Prisma schema

**File:** `prisma/schema.prisma`

- [ ] **Step 1: Edit schema**

Add `codeforcesUsername String?` after `leetcodeUsername` on line 39:

```prisma
  leetcodeUsername  String?
  codeforcesUsername String?
  emailSubscribed   Boolean        @default(false)
```

- [ ] **Step 2: Generate Prisma migration**

```bash
cd /Users/tanish/Desktop/leetcode
bunx prisma migrate dev --name add_codeforces_username
```

Expected: Migration created and applied.

- [ ] **Step 3: Verify schema compiles**

```bash
bunx prisma generate
```

---

### Task 1.2: Create Codeforces server action

**File:** Create `actions/codeforces.ts`

- [ ] **Step 1: Write the action**

```typescript
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveCodeforcesUsername(username: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const trimmed = username.trim();
  if (!trimmed) return { success: false, error: "Username cannot be empty" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { codeforcesUsername: trimmed },
  });

  return { success: true };
}
```

Mirror of `actions/profile.ts` `saveLeetcodeUsername`.

---

### Task 1.3: Codeforces API proxy routes

**File:** Create `app/api/codeforces/user/route.ts`

- [ ] **Step 1: Write user route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const CF_API = "https://codeforces.com/api";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const cacheKey = `codeforces:user:${handle}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${CF_API}/user.info?handles=${handle}`);
    const data = await res.json();

    if (data.status !== "OK" || !data.result?.length) {
      return NextResponse.json({ error: "Codeforces user not found" }, { status: 404 });
    }

    const user = data.result[0];
    const result = {
      handle: user.handle,
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rank: user.rank ?? null,
      maxRank: user.maxRank ?? null,
      avatar: user.avatar ?? null,
      titlePhoto: user.titlePhoto ?? null,
      contribution: user.contribution ?? 0,
      lastOnlineTimeSeconds: user.lastOnlineTimeSeconds ?? null,
      registrationTimeSeconds: user.registrationTimeSeconds ?? null,
    };

    try { await redis.setex(cacheKey, CACHE_TTL.STATS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Codeforces user" }, { status: 500 });
  }
}
```

**File:** Create `app/api/codeforces/rating/route.ts`

- [ ] **Step 2: Write rating route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { redis, CACHE_TTL } from "@/lib/redis";

const CF_API = "https://codeforces.com/api";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const cacheKey = `codeforces:rating:${handle}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  try {
    const res = await fetch(`${CF_API}/user.rating?handle=${handle}`);
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json({ error: "Failed to fetch rating history" }, { status: 404 });
    }

    const ratingHistory = data.result.map((entry: any) => ({
      contestId: entry.contestId,
      contestName: entry.contestName,
      rank: entry.rank,
      oldRating: entry.oldRating,
      newRating: entry.newRating,
      ratingUpdateTimeSeconds: entry.ratingUpdateTimeSeconds,
    }));

    const result = { ratingHistory };

    try { await redis.setex(cacheKey, CACHE_TTL.STATS, result); } catch {}

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rating history" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify routes build**

```bash
cd /Users/tanish/Desktop/leetcode
bun run build 2>&1 | head -50
```

---

### Task 1.4: User profile API endpoint (for extension)

**File:** Create `app/api/user/profile/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, leetcodeUsername: true, codeforcesUsername: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    email: user.email,
    leetcodeUsername: user.leetcodeUsername,
    codeforcesUsername: user.codeforcesUsername,
  });
}
```

---

## Chunk 2: Codeforces Page (Frontend)

### Task 2.1: Codeforces components

**File:** Create `components/codeforces-user-card.tsx`

- [ ] **Step 1: Write CodeforcesUserCard**

```tsx
interface CodeforcesUserCardProps {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  avatar: string | null;
  titlePhoto: string | null;
  contribution: number;
  lastOnlineTimeSeconds: number | null;
  registrationTimeSeconds: number | null;
}

function getRatingColor(rating: number | null): string {
  if (!rating) return "text-gray-400";
  if (rating >= 4000) return "text-red-900";
  if (rating >= 3000) return "text-red-700";
  if (rating >= 2400) return "text-red-500";
  if (rating >= 2300) return "text-orange-500";
  if (rating >= 2100) return "text-orange-400";
  if (rating >= 1900) return "text-purple-500";
  if (rating >= 1600) return "text-blue-500";
  if (rating >= 1400) return "text-teal-500";
  if (rating >= 1200) return "text-green-500";
  return "text-gray-500";
}

function getRankBadge(rank: string | null): string {
  if (!rank) return "bg-gray-100 text-gray-600";
  if (rank.includes("legendary")) return "bg-red-900 text-white";
  if (rank.includes("grandmaster")) return "bg-red-500 text-white";
  if (rank.includes("master")) return "bg-orange-400 text-white";
  if (rank.includes("candidate")) return "bg-purple-500 text-white";
  if (rank.includes("expert")) return "bg-blue-500 text-white";
  if (rank.includes("specialist")) return "bg-teal-500 text-white";
  if (rank.includes("pupil")) return "bg-green-500 text-white";
  return "bg-gray-500 text-white";
}

export function CodeforcesUserCard({
  handle, rating, maxRating, rank, maxRank, avatar, contribution,
  lastOnlineTimeSeconds, registrationTimeSeconds,
}: CodeforcesUserCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border p-4">
      <img
        src={titlePhoto || avatar || "https://codeforces.org/s/0/images/codeforces-logo.png"}
        alt={handle}
        className="h-16 w-16 rounded-full object-cover"
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{handle}</span>
          {rank && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRankBadge(rank)}`}>
              {rank}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {rating !== null && (
            <span className={getRatingColor(rating)}>
              Rating: <strong>{rating}</strong>
            </span>
          )}
          {maxRating !== null && (
            <span className="text-muted-foreground">
              Max: <strong>{maxRating}</strong> {maxRank ? `(${maxRank})` : ""}
            </span>
          )}
          <span className="text-muted-foreground">Contribution: {contribution}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {lastOnlineTimeSeconds && (
            <span>Last seen: {new Date(lastOnlineTimeSeconds * 1000).toLocaleDateString()} — </span>
          )}
          {registrationTimeSeconds && (
            <span>Registered: {new Date(registrationTimeSeconds * 1000).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

**File:** Create `components/rating-history-chart.tsx`

- [ ] **Step 2: Write RatingHistoryChart**

```tsx
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface RatingPoint {
  contestName: string;
  rating: number;
  date: string;
  rank: number;
}

interface RatingHistoryChartProps {
  data: RatingPoint[];
}

function getRatingColor(rating: number): string {
  if (rating >= 4000) return "#7f0000";
  if (rating >= 3000) return "#cc0000";
  if (rating >= 2400) return "#ff0000";
  if (rating >= 2300) return "#ff8c00";
  if (rating >= 2100) return "#ff8c00";
  if (rating >= 1900) return "#aa00aa";
  if (rating >= 1600) return "#0000ff";
  if (rating >= 1400) return "#008080";
  if (rating >= 1200) return "#008000";
  return "#808080";
}

const renderColorfulLegendText = (value: string) => (
  <span style={{ color: getRatingColor(parseInt(value)) }}>{value}</span>
);

export function RatingHistoryChart({ data }: RatingHistoryChartProps) {
  if (!data?.length) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        No contest history available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));

  const minRating = Math.min(...data.map((d) => d.rating)) - 100;
  const maxRating = Math.max(...data.map((d) => d.rating)) + 100;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-4 text-lg font-semibold">Rating History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            domain={[minRating, maxRating]}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.contestName || ""}
            formatter={(value: number) => [value, "Rating"]}
          />
          <ReferenceLine y={1200} stroke="#008000" strokeDasharray="4 4" label="Pupil" />
          <ReferenceLine y={1400} stroke="#008080" strokeDasharray="4 4" label="Specialist" />
          <ReferenceLine y={1600} stroke="#0000ff" strokeDasharray="4 4" label="Expert" />
          <ReferenceLine y={1900} stroke="#aa00aa" strokeDasharray="4 4" label="Candidate Master" />
          <ReferenceLine y={2100} stroke="#ff8c00" strokeDasharray="4 4" label="Master" />
          <ReferenceLine y={2400} stroke="#ff0000" strokeDasharray="4 4" label="Grandmaster" />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**File:** Create `components/contest-history-table.tsx`

- [ ] **Step 3: Write ContestHistoryTable**

```tsx
"use client";

import { useState } from "react";

interface ContestEntry {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface ContestHistoryTableProps {
  contests: ContestEntry[];
}

export function ContestHistoryTable({ contests }: ContestHistoryTableProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? contests : contests.slice(0, 20);

  if (!contests?.length) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        No contest history available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Contest History ({contests.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Contest</th>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Old Rating</th>
              <th className="px-4 py-2 font-medium">New Rating</th>
              <th className="px-4 py-2 font-medium">Delta</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((c, i) => {
              const delta = c.newRating - c.oldRating;
              const isPositive = delta >= 0;
              return (
                <tr key={c.contestId ?? i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{contests.length - i}</td>
                  <td className="px-4 py-2 font-medium">{c.contestName}</td>
                  <td className="px-4 py-2">{c.rank}</td>
                  <td className="px-4 py-2">{c.oldRating}</td>
                  <td className="px-4 py-2 font-semibold">{c.newRating}</td>
                  <td className={`px-4 py-2 font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                    {isPositive ? `+${delta}` : delta}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {contests.length > 20 && (
        <div className="p-3 text-center border-t">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {showAll ? "Show less" : `Show all ${contests.length} contests`}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### Task 2.2: CodeforcesUsernameForm

**File:** Create `components/codeforces-username-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCodeforcesUsername } from "@/actions/codeforces";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CodeforcesUsernameFormProps {
  initialValue?: string;
}

export function CodeforcesUsernameForm({ initialValue }: CodeforcesUsernameFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialValue || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setStatus("idle");

    const result = await saveCodeforcesUsername(username);

    setLoading(false);
    if (result.success) {
      setStatus("success");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Failed to save");
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3">Link Codeforces Account</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Enter Codeforces handle"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={loading || !username.trim()}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </form>
      {status === "success" && (
        <p className="text-sm text-green-500 mt-2">Saved!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive mt-2">{errorMsg}</p>
      )}
    </Card>
  );
}
```

---

### Task 2.3: CodeforcesProfile client component

**File:** Create `components/codeforces-profile.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeforcesUserCard } from "./codeforces-user-card";
import { RatingHistoryChart } from "./rating-history-chart";
import { ContestHistoryTable } from "./contest-history-table";

interface CodeforcesProfileProps {
  handle: string;
}

interface UserData {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  avatar: string | null;
  titlePhoto: string | null;
  contribution: number;
  lastOnlineTimeSeconds: number | null;
  registrationTimeSeconds: number | null;
}

interface RatingEntry {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

export function CodeforcesProfile({ handle }: CodeforcesProfileProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserData | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingEntry[]>([]);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [userRes, ratingRes] = await Promise.all([
        fetch(`/api/codeforces/user?handle=${handle}`),
        fetch(`/api/codeforces/rating?handle=${handle}`),
      ]);

      const [userData, ratingData] = await Promise.all([
        userRes.json(),
        ratingRes.json(),
      ]);

      if (userData.error) {
        setError(userData.error);
        setLoading(false);
        return;
      }

      setUser(userData);
      setRatingHistory(ratingData.ratingHistory || []);
    } catch {
      setError("Failed to fetch Codeforces data");
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [handle]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </Card>
    );
  }

  if (!user) return null;

  const chartData = ratingHistory
    .filter((r) => r.newRating > 0)
    .map((r) => ({
      contestName: r.contestName,
      rating: r.newRating,
      date: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString(),
      rank: r.rank,
    }));

  return (
    <div className="space-y-6">
      <CodeforcesUserCard {...user} />
      <RatingHistoryChart data={chartData} />
      <ContestHistoryTable contests={ratingHistory} />
    </div>
  );
}
```

---

### Task 2.4: Create /codeforces page

**File:** Create `app/(main)/codeforces/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { CodeforcesUsernameForm } from "@/components/codeforces-username-form";
import { CodeforcesProfile } from "@/components/codeforces-profile";

export default async function CodeforcesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { codeforcesUsername: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Codeforces Profile</h1>

      {!user?.codeforcesUsername ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Link your Codeforces account to see your rating, contest history, and more.
          </p>
          <CodeforcesUsernameForm />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4">
            <CodeforcesUsernameForm initialValue={user.codeforcesUsername} />
          </div>
          <CodeforcesProfile handle={user.codeforcesUsername} />
        </>
      )}
    </div>
  );
}
```

---

## Chunk 3: Dashboard Reorganization + Navigation

### Task 3.1: Create /stats page

**File:** Create `app/(main)/stats/page.tsx`

- [ ] **Step 1: Write the page**

This page mirrors the LeetCode stats section from the current dashboard.

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form";
import { LeetcodeStats } from "@/components/leetcode-stats";

function slugFromUrl(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/);
  return match ? match[1] : null;
}

export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });

  const userQuestions = user?.leetcodeUsername
    ? await prisma.question.findMany({
        where: {
          userQuestions: { some: { userId: session.user.id } },
        },
        select: { id: true, leetcodeUrl: true },
      })
    : [];

  const slugToQuestionId: Record<string, string> = {};
  for (const q of userQuestions) {
    const slug = slugFromUrl(q.leetcodeUrl);
    if (slug) slugToQuestionId[slug] = q.id;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">LeetCode Stats</h1>

      {!user?.leetcodeUsername ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Link your LeetCode account to see your stats, heatmap, skills, and more.
          </p>
          <LeetcodeUsernameForm />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4">
            <LeetcodeUsernameForm initialValue={user.leetcodeUsername} />
          </div>
          <LeetcodeStats
            username={user.leetcodeUsername}
            slugToQuestionId={slugToQuestionId}
          />
        </>
      )}
    </div>
  );
}
```

---

### Task 3.2: Reorganize dashboard (lean)

**File:** Modify `app/(main)/dashboard/page.tsx`

- [ ] **Step 1: Edit dashboard page**

Remove the `slugFromUrl` section (since slug mapping moved to /stats), remove `LeetcodeStats` import and rendering, add links to /stats and /codeforces.

Replace the entire file content:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getDashboardStats } from "@/actions/stats";
import { StatsOverview } from "@/components/stats-overview";
import { CompanyProgress } from "@/components/company-progress";
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form";
import { CodeforcesUsernameForm } from "@/components/codeforces-username-form";
import { EmailSubscriptionToggle } from "@/components/email-subscription-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [user, result] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, codeforcesUsername: true },
    }),
    getDashboardStats(),
  ]);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-destructive">Failed to load dashboard stats.</p>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <div className="flex flex-col gap-8">
        <StatsOverview totalSolved={stats.totalSolved} byDifficulty={stats.byDifficulty} />

        {/* Quick links to detailed stats pages */}
        <div className="flex flex-wrap gap-3">
          <Link href="/stats">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View LeetCode Stats
            </Button>
          </Link>
          <Link href="/codeforces">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              View Codeforces Profile
            </Button>
          </Link>
        </div>

        {/* Username forms */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Linked Accounts</h2>
          <div className="flex flex-col gap-4">
            <LeetcodeUsernameForm initialValue={user?.leetcodeUsername || ""} />
            <CodeforcesUsernameForm initialValue={user?.codeforcesUsername || ""} />
          </div>
          <div className="mt-4">
            <EmailSubscriptionToggle />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">Company Progress</h2>
          <CompanyProgress companies={stats.byCompany} />
        </section>
      </div>
    </div>
  );
}
```

---

### Task 3.3: Update navbar

**File:** Modify `components/navbar.tsx`

- [ ] **Step 1: Add Stats and Codeforces links to desktop nav**

After the Dashboard link (around line 53), add:

```tsx
<Link href="/stats"><Button variant="ghost" size="sm">Stats</Button></Link>
<Link href="/codeforces"><Button variant="ghost" size="sm">Codeforces</Button></Link>
```

- [ ] **Step 2: Add Stats and Codeforces links to mobile nav**

After the Dashboard link (around line 92), add:

```tsx
<Link href="/stats" className="py-2 text-sm" onClick={() => setOpen(false)}>
  Stats
</Link>
<Link href="/codeforces" className="py-2 text-sm" onClick={() => setOpen(false)}>
  Codeforces
</Link>
```

---

### Task 3.4: Update middleware

**File:** Modify `middleware.ts`

- [ ] **Step 1: Add /stats and /codeforces to PROTECTED_ROUTES**

```typescript
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/stats", "/codeforces"];
```

- [ ] **Step 2: Add to matcher**

```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/stats/:path*", "/codeforces/:path*"],
};
```

---

## Chunk 4: Extension Enhancement

### Task 4.1: Add background worker handlers

**File:** Modify `leetcode-extension/entrypoints/background.ts`

- [ ] **Step 1: Add GET_USER_PROFILE handler**

Add this function before the message router:

```typescript
// ─── User Profile ───────────────────────────────────

async function getUserProfile() {
  try {
    const res = await fetch(`${APP_URL}/api/user/profile`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, ...data }
    }
  } catch { /* ignore */ }
  return { success: false as const }
}
```

- [ ] **Step 2: Add GET_LEETCODE_STATS handler**

```typescript
// ─── LeetCode Stats ─────────────────────────────────

async function getLeetcodeStats(username: string) {
  try {
    const res = await fetch(`${APP_URL}/api/leetcode/stats?username=${username}`)
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, stats: data }
    }
  } catch { /* ignore */ }
  return { success: false as const }
}
```

- [ ] **Step 3: Add new cases in message router**

In the switch statement (before `default`), add:

```typescript
case 'GET_USER_PROFILE':
  sendResponse(await getUserProfile())
  break
case 'GET_LEETCODE_STATS':
  sendResponse(await getLeetcodeStats(message.username))
  break
```

---

### Task 4.2: Redesign extension popup

**File:** Modify `leetcode-extension/entrypoints/popup/App.tsx`

- [ ] **Step 1: Rewrite the main view**

Replace the entire main (authenticated) view with the enhanced version:

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'

// ─── Motivation Quotes ──────────────────────────────

const QUOTES = [
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "It's not a bug — it's an undocumented feature.", author: "Unknown" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
  { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "Optimism is an occupational hazard of programming.", author: "Alan Perlis" },
  { text: "In theory, there is no difference between theory and practice. But in practice, there is.", author: "Jan L. A. van de Snepscheut" },
]

// ─── Animated Counter ───────────────────────────────

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 600
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <>{display}{suffix}</>
}

type ViewState = 'loading' | 'auth' | 'main'

function App() {
  const [view, setView] = useState<ViewState>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [leetcodeUsername, setLeetcodeUsername] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // LeetCode stats
  const [lcStats, setLcStats] = useState<{
    solved: { solvedProblem: number; easySolved: number; mediumSolved: number; hardSolved: number }
  } | null>(null)
  const [lcLoading, setLcLoading] = useState(false)

  // Random quote
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

  // ─── Check auth on mount ──────────────────────────

  useEffect(() => {
    ;(async () => {
      const res = await browser.runtime.sendMessage({ action: 'CHECK_AUTH' })
      if (res.authenticated) {
        setUserEmail(res.email)
        const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
        setTodayCount(c.count || 0)

        // Fetch user profile to get leetcodeUsername
        const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
        if (profile.success && profile.leetcodeUsername) {
          setLeetcodeUsername(profile.leetcodeUsername)
        }

        setView('main')
      } else {
        setView('auth')
      }
    })()
  }, [])

  // ─── Fetch LC stats when username available ───────

  useEffect(() => {
    if (view !== 'main' || !leetcodeUsername) return
    ;(async () => {
      setLcLoading(true)
      const res = await browser.runtime.sendMessage({
        action: 'GET_LEETCODE_STATS',
        username: leetcodeUsername,
      })
      if (res.success && res.stats?.solved) {
        setLcStats(res.stats)
      }
      setLcLoading(false)
    })()
  }, [view, leetcodeUsername])

  // ─── Email login ──────────────────────────────────

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const res = await browser.runtime.sendMessage({
      action: 'LOGIN', email, password,
    })
    if (res.success) {
      setUserEmail(res.email)
      const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
      setTodayCount(c.count || 0)

      const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
      if (profile.success && profile.leetcodeUsername) {
        setLeetcodeUsername(profile.leetcodeUsername)
      }

      setView('main')
    } else {
      setError(res.error || 'Login failed')
    }
    setBusy(false)
  }, [email, password])

  // ─── Google OAuth ────────────────────────────────

  const handleGoogle = useCallback(async () => {
    const base = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://lc-grind.vercel.app'
    await browser.tabs.create({ url: `${base}/login?redirect=/extension-auth-callback` })

    setBusy(true)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const res = await browser.runtime.sendMessage({ action: 'CHECK_AUTH' })
      if (res.authenticated) {
        clearInterval(poll)
        setUserEmail(res.email)
        const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
        setTodayCount(c.count || 0)

        const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
        if (profile.success && profile.leetcodeUsername) {
          setLeetcodeUsername(profile.leetcodeUsername)
        }

        setView('main')
        setBusy(false)
      } else if (attempts >= 60) {
        clearInterval(poll)
        setError('Login timed out')
        setBusy(false)
      }
    }, 2000)
  }, [])

  // ─── Logout ───────────────────────────────────────

  const handleLogout = useCallback(async () => {
    await browser.runtime.sendMessage({ action: 'LOGOUT' })
    setView('auth')
    setUserEmail('')
    setLeetcodeUsername('')
    setTodayCount(0)
    setLcStats(null)
  }, [])

  // ─── Register ─────────────────────────────────────

  const handleRegister = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const base = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://lc-grind.vercel.app'
    browser.tabs.create({ url: `${base}/register` })
  }, [])

  // ─── Render ───────────────────────────────────────

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 text-white shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"/><path d="M10 22h4"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-gray-900">LC Tracker</span>
    </div>
  )

  if (view === 'loading') {
    return (
      <div className="p-5 flex flex-col gap-4">
        {brand}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (view === 'auth') {
    return (
      <div className="p-5 flex flex-col gap-4 animate-[fadeSlideIn_0.2s_ease-out]">
        {brand}
        <form onSubmit={handleLogin} className="flex flex-col gap-2.5">
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all disabled:opacity-50"
          />
          <input
            type="password" placeholder="Password" required autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={busy}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-gray-300 text-xs font-medium">
          <div className="flex-1 h-px bg-gray-100" />
          <span>or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <button type="button" onClick={handleGoogle} disabled={busy}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all disabled:opacity-50">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center">
          <a href="#" onClick={handleRegister}
            className="text-xs text-gray-400 hover:text-gray-900 no-underline transition-colors">
            Create an account
          </a>
        </p>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  // Main (authenticated) view — enhanced
  return (
    <div className="p-5 flex flex-col gap-3 animate-[fadeSlideIn_0.2s_ease-out]">
      {brand}

      {/* User info card */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 transition-all hover:border-gray-200">
        <p className="text-sm font-medium text-gray-900 break-all">{userEmail}</p>

        {/* Today's count */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Added today:</span>
          <span className="text-sm font-bold text-indigo-500">
            <AnimatedCounter value={todayCount} />
          </span>
        </div>

        {/* LeetCode stats */}
        {leetcodeUsername && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            {lcLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                Loading stats...
              </div>
            ) : lcStats ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">LeetCode Stats</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-gray-900">{lcStats.solved.solvedProblem}</span>
                  <span className="text-green-500">{lcStats.solved.easySolved}E</span>
                  <span className="text-yellow-500">{lcStats.solved.mediumSolved}M</span>
                  <span className="text-red-500">{lcStats.solved.hardSolved}H</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Motivation quote */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-xl px-3.5 py-2.5 transition-all hover:border-indigo-200">
        <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
        <p className="text-[10px] text-gray-400 mt-1 text-right">&mdash; {quote.author}</p>
      </div>

      <button type="button" onClick={handleLogout}
        className="w-full py-2 text-xs font-medium rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all">
        Sign Out
      </button>
    </div>
  )
}

export default App
```

---

### Task 4.3: Update extension styles with animation keyframes

**File:** Modify `leetcode-extension/entrypoints/popup/style.css`

- [ ] **Step 1: Add animation keyframes**

```css
@import "tailwindcss";

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

body {
  @apply w-[340px] min-h-[360px] bg-white text-gray-900 antialiased;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', sans-serif;
}
```

---

## Chunk 5: Documentation

### Task 5.1: Update wiki

- [ ] **Step 1: Update wiki pages**

Update these wiki files:
- `docs/wiki/data-model.md` — add `codeforcesUsername` to User model
- `docs/wiki/pages.md` — add `/stats` and `/codeforces` routes
- `docs/wiki/actions.md` — add `saveCodeforcesUsername` and `/api/user/profile`
- `docs/wiki/components.md` — add new components (CodeforcesProfile, CodeforcesUserCard, etc.)
- `docs/wiki/extension.md` — update popup section with new features
- `docs/wiki/index.md` — update changelog

- [ ] **Step 2: Run build to verify everything compiles**

```bash
cd /Users/tanish/Desktop/leetcode
bun run build
```

- [ ] **Step 3: Run extension build**

```bash
cd /Users/tanish/Desktop/leetcode/leetcode-extension
npm run build
```
