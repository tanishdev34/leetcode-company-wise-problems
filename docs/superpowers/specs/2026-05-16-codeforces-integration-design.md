# Codeforces Integration + Dashboard Reorganization

**Date:** 2026-05-16
**Status:** Approved

## Overview

Add Codeforces profile integration (rating, contest history, rating history chart) to the LeetCode Company Tracker app, and reorganize the dashboard by moving LeetCode-heavy stats to a dedicated `/stats` page.

## Goals

1. Allow users to save their Codeforces handle
2. Display Codeforces rating, rank, contest history, and rating history chart on a dedicated `/codeforces` page
3. Clean up the dashboard by moving LeetCode stats components (SolvedProgress, ContestStats, SubmissionHeatmap, SkillBars, RecentSolvedList) to a new `/stats` page
4. Keep the dashboard lean with overview stats, company progress, username forms, and email toggle

## Data Model

### User model — add `codeforcesUsername`

| Field | Type | Notes |
|-------|------|-------|
| `codeforcesUsername` | String? | Linked Codeforces handle, nullable |

Same pattern as the existing `leetcodeUsername` field.

### Server Action

**`actions/codeforces.ts`** (new file):
- `saveCodeforcesUsername(username)` — same pattern as `actions/profile.ts` `saveLeetcodeUsername`

## API Routes (proxy to Codeforces API)

Following the existing LeetCode API proxy pattern in `app/api/leetcode/`.

| Route | Codeforces API | Description | Caching |
|-------|---------------|-------------|---------|
| `GET /api/codeforces/user?handle=` | `user.info` | Returns rating, maxRating, rank, maxRank, avatar, titlePhoto, contribution, lastOnlineTimeSeconds | Redis 5 min |
| `GET /api/codeforces/rating?handle=` | `user.rating` | Returns contest history: contestName, rank, oldRating, newRating, ratingUpdateTimeSeconds | Redis 5 min |

The Codeforces API is public and requires no auth key.

### Response shape

**`/api/codeforces/user`** returns:
```json
{
  "handle": "tourist",
  "rating": 4000,
  "maxRating": 4039,
  "rank": "legendary grandmaster",
  "maxRank": "legendary grandmaster",
  "avatar": "https://...",
  "titlePhoto": "https://...",
  "contribution": 77,
  "lastOnlineTimeSeconds": 1680000000,
  "registrationTimeSeconds": 1260000000
}
```

**`/api/codeforces/rating`** returns:
```json
{
  "ratingHistory": [
    {
      "contestId": 123,
      "contestName": "Codeforces Round #800",
      "rank": 42,
      "oldRating": 1500,
      "newRating": 1600,
      "ratingUpdateTimeSeconds": 1670000000
    }
  ]
}
```

## New Pages

### `/stats` — LeetCode full stats (moved from dashboard)

| Route | File | Auth | Description |
|-------|------|------|-------------|
| `/stats` | `app/(main)/stats/page.tsx` | Auth required | Contains: SolvedProgress, ContestStats, SubmissionHeatmap, SkillBars, RecentSolvedList |

- Same data fetching as current dashboard
- SSR with auth check, fetches LeetCode stats via existing API routes
- Learns from dashboard page.tsx pattern

### `/codeforces` — Codeforces profile

| Route | File | Auth | Description |
|-------|------|------|-------------|
| `/codeforces` | `app/(main)/codeforces/page.tsx` | Auth required | Contains: CodeforcesProfile (rating card + chart + contest history) |

### CodeforcesPage Components

1. **CodeforcesProfile** (client component) — fetches from `/api/codeforces/user` and `/api/codeforces/rating`
2. **CodeforcesUserCard** — avatar, handle, current rating (colored by rank), max rating, rank title, contribution
3. **RatingHistoryChart** — line chart of rating over time using recharts, with CF rank color zones
4. **ContestHistoryTable** — table with contest name, rank, rating change (old → new, colored delta), date
5. **CodeforcesUsernameForm** — form to set/change CF username (like existing LeetcodeUsernameForm)

### Rank tier colors (CF standard)
- Newbie (0–1199): Gray
- Pupil (1200–1399): Green
- Specialist (1400–1599): Teal
- Expert (1600–1899): Blue
- Candidate Master (1900–2099): Purple
- Master (2100–2299): Orange
- International Master (2300–2399): Orange/Red
- Grandmaster (2400–2999): Red
- International Grandmaster (3000–3999): Dark Red
- Legendary Grandmaster (4000+): Dark Red with special styling

## Dashboard Reorganization

### Current dashboard (too cluttered)
```
Dashboard
├── StatsOverview
├── CompanyProgress
├── LeetcodeUsernameForm
├── LeetcodeStats
│   ├── SolvedProgress
│   ├── ContestStats
│   ├── SubmissionHeatmap
│   ├── SkillBars
│   └── RecentSolvedList
├── EmailSubscriptionToggle
└── DailyProblemCard (not currently rendered, but in code)
```

### New dashboard (lean)
```
Dashboard
├── StatsOverview
├── LeetcodeUsernameForm (inline)
├── CodeforcesUsernameForm (NEW)
├── EmailSubscriptionToggle
├── Quick links to /stats and /codeforces
└── CompanyProgress
```

### New `/stats` page
```
Stats Page
├── LeetcodeUsernameForm (if not set)
├── LeetcodeStats (full)
│   ├── SolvedProgress
│   ├── ContestStats
│   ├── SubmissionHeatmap
│   ├── SkillBars
│   └── RecentSolvedList
```

## Navigation Updates

Navbar gets two new links (visible when authenticated):
- "Stats" → `/stats`
- "Codeforces" → `/codeforces`

## Middleware

The middleware already protects `/dashboard` by requiring auth. Add `/stats` and `/codeforces` to the protected routes.

## Extension Enhancement

The browser extension's authenticated popup (`leetcode-extension/entrypoints/popup/App.tsx`) currently only shows:
- User email
- "X questions added today"

Enhance it with:

### 1. LeetCode Rating & Stats

**Challenge:** The extension doesn't know the user's LeetCode username. Solution: Extend the `CHECK_AUTH` response (or add `GET_USER_PROFILE`) to return the user's `leetcodeUsername` from the app's session.

**New message action — `GET_LEETCODE_STATS`:**
- Background worker fetches from `GET /api/leetcode/stats?username=...` 
- Returns: solved counts (total, easy, medium, hard), current ranking

**New message action — `GET_USER_PROFILE`:**
- Background worker fetches from `GET /api/auth/get-session` and also returns `leetcodeUsername` (which the background worker saves)
- Or we add a dedicated `GET /api/user/profile` endpoint that returns the full user profile

### 2. Motivation Quotes

Embed a curated list of ~20 programming/motivational quotes in the extension and display one randomly when the popup opens. Refresh on each popup open.

Example quotes:
- "The only way to learn a new programming language is by writing programs in it." — Dennis Ritchie
- "First, solve the problem. Then, write the code." — John Johnson
- "Code is like humor. When you have to explain it, it's bad." — Cory House

### 3. Simple Animations

The extension already uses `animate-[fadeSlideIn_0.2s_ease-out]`. Add:
- **Animated counters** — numbers count up from 0 when popup opens (today count, solved counts)
- **Fade transitions** between views (already partially done)
- **Subtle hover effects** on cards (scale/border color transitions)

### Updated Extension Popup Layout (Main View)

```
┌──────────────────────────┐
│ [brand] LC Tracker       │
│                          │
│ ┌──────────────────────┐ │
│ │ ✉️ user@email.com    │ │
│ │                      │ │
│ │ 📊 Rating: 1850      │ │
│ │ 🟢 Easy: 320 / 941   │ │
│ │ 🟡 Medium: 450 / 2050│ │
│ │ 🔴 Hard: 120 / 929   │ │
│ │                      │ │
│ │ 📝 5 added today     │ │
│ └──────────────────────┘ │
│                          │
│ "Code is like humor..."  │
│                          │
│ [Sign Out]               │
└──────────────────────────┘
```

### Background Worker Changes

Add these message handlers:
- `GET_USER_PROFILE` — fetches `GET /api/auth/get-session`, stores `leetcodeUsername`, returns full profile
- `GET_LEETCODE_STATS` — fetches `GET /api/leetcode/stats?username=...`, returns stats

### App API Changes

Add a new endpoint:
- `GET /api/user/profile` — returns the current user's profile (email, leetcodeUsername, codeforcesUsername)

## Updated Implementation Order

1. Add `codeforcesUsername` to Prisma schema + generate migration
2. Create `actions/codeforces.ts` server action
3. Create `components/codeforces-username-form.tsx`
4. Create `app/api/codeforces/user/route.ts` proxy
5. Create `app/api/codeforces/rating/route.ts` proxy
6. Create Codeforces page components (CodeforcesUserCard, RatingHistoryChart, ContestHistoryTable, CodeforcesProfile)
7. Create `/codeforces` page
8. Move LeetCode stats to `/stats` page
9. Reorganize dashboard (keep lean, add links)
10. Update navbar with new links
11. Update middleware for new protected routes
12. **Extension enhancements:**
    12a. Add `GET /api/user/profile` endpoint
    12b. Add `GET_USER_PROFILE` + `GET_LEETCODE_STATS` background worker handlers
    12c. Redesign popup main view with stats, quotes, animations
13. Update wiki documentation
