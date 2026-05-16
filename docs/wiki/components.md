# Components

> **See also:** [[pages]] | [[actions]] | [[architecture]]

## Component Tree

```
Navbar                                 [[pages#landing-page]]
├── SearchBar                          [[components#search]]
└── Auth buttons + Dashboard link      [[components#auth]]

Landing Page (/)                       [[pages#landing-page]]
├── SearchBar                          [[components#search]]
├── Stats cards
├── CompanyCard[] (top 12)             [[components#company]]
└── Recently added question list

Company Detail (/companies/[slug])     [[pages#company-detail-companiesslug]]
├── TimePeriodTabs                     [[components#company]]
└── QuestionTable                      [[components#question-table]]
    └── QuestionRow[]
        ├── Checkbox                   → [[actions#toggleSolved]]
        ├── DifficultyBadge            [[components#questions]]
        ├── Topic tags
        └── QuestionDetail (expandable)
            └── NoteEditor             [[components#questions]]

Search (/search)                       [[pages#search-search]]
├── SearchBar                          [[components#search]]
└── SearchResults                      [[components#search]]
    └── Result items + DifficultyBadge

Dashboard (/dashboard)                 [[pages#dashboard-dashboard]]
├── StatsOverview                      [[components#dashboard]]
├── Quick links (to /stats, /codeforces) [[components#dashboard]]
├── Linked Accounts
│   ├── LeetCodeUsernameForm            [[components#dashboard]]
│   ├── CodeforcesUsernameForm          [[components#codeforces]]
│   └── EmailSubscriptionToggle         [[components#dashboard]]
└── CompanyProgress                    [[components#dashboard]]

Stats (/stats)                         [[pages#stats-leetcode-stats]]
├── LeetcodeUsernameForm               [[components#dashboard]]
└── LeetcodeStats                      [[components#dashboard]]
    ├── SolvedProgress                 [[components#dashboard]]
    ├── ContestStats                   [[components#dashboard]]
    ├── SubmissionHeatmap              [[components#dashboard]]
    ├── SkillBars                      [[components#dashboard]]
    └── RecentSolvedList               [[components#dashboard]]

Codeforces (/codeforces)               [[pages#codeforces-codeforces]]
├── CodeforcesUsernameForm             [[components#codeforces]]
└── CodeforcesProfile                  [[components#codeforces]]
    ├── CodeforcesUserCard             [[components#codeforces]]
    ├── RatingHistoryChart             [[components#codeforces]]
    └── ContestHistoryTable            [[components#codeforces]]

Question Detail (/questions/[id])      [[pages]]
├── Checkbox                           → [[actions#toggleSolved]]
├── DifficultyBadge                    [[components#questions]]
├── Topic tags
├── Company links                      → [[pages#company-detail-companiesslug]]
├── NoteEditor                         [[components#questions]]
└── Code editor + AI analysis          → [[actions#post-apianalyze]] (background job, polled)
```

## Component Reference

### Layout
| Component | File | Props | Used On | Notes |
|-----------|------|-------|---------|-------|
| `Navbar` | `navbar.tsx` | — | All [[pages#main-group-main]] routes | Uses `useSession()`, renders auth buttons/nav |
| `ThemeProvider` | `theme-provider.tsx` | `children` | Root layout | next-themes wrapper |
| `LoadingBar` | `loading-bar.tsx` | — | All routes | Top loading progress bar |

### Company
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `CompanyCard` | `company-card.tsx` | `name, slug, questionCount, solvedCount?` | [[pages#landing-page]], [[pages#companies-list-companies]] | Direct Prisma SSR |
| `CompanyProgress` | `company-progress.tsx` | `companies: { name, solved, total }[]` | [[pages#dashboard-dashboard]] | [[actions#getDashboardStats]] |
| `TimePeriodTabs` | `time-period-tabs.tsx` | `value: TimePeriod, onChange` | [[pages#company-detail-companiesslug]] | Filters [[actions#getCompanyQuestions]] by [[data-model#timeperiod-enum]] |

### Questions
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `QuestionTable` | `question-table.tsx` | `questions[], isAuthenticated, loading?` | [[pages#company-detail-companiesslug]] | [[actions#getCompanyQuestions]] |
| `QuestionRow` | `question-row.tsx` | `id, title, leetcodeUrl, difficulty, topics, frequency, solved, isAuthenticated` | [[pages#company-detail-companiesslug]] | Renders each item from `QuestionTable` |
| `QuestionDetail` | `question-detail.tsx` | `questionId, isAuthenticated` | Inside `QuestionRow` (expandable) | [[actions#getNotes]] (lazy-loaded) |
| `NoteEditor` | `note-editor.tsx` | `questionId, initialNotes` | [[pages]], `QuestionDetail` | [[actions#saveNotes]] (debounced auto-save) |
| `DifficultyBadge` | `difficulty-badge.tsx` | `difficulty: "EASY" \| "MEDIUM" \| "HARD"` | Multiple | Renders [[data-model#enums]] difficulty |
| `RecentSolvedList` | `recent-solved-list.tsx` | `submissions[], count, slugToQuestionId?` | [[pages#dashboard-dashboard]] (rendered inside `LeetCodeStats`) | LeetCode submissions API; links to local `/questions/{id}` when slug is in `slugToQuestionId`, else falls back to leetcode.com |

### Search
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `SearchBar` | `search-bar.tsx` | `className?, placeholder?` | [[pages#landing-page]], [[pages#search-search]] | Debounced 300ms → navigates to `/search?q=...` |
| `SearchResults` | `search-results.tsx` | `results[], query, loading?` | [[pages#search-search]] | [[actions#get-apisearchqpage1pagesize20]] |

### Dashboard
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `StatsOverview` | `stats-overview.tsx` | `totalSolved, byDifficulty` | [[pages#dashboard-dashboard]] | [[actions#getDashboardStats]] |
| `LeetCodeStats` | `leetcode-stats.tsx` | `username, slugToQuestionId?` | [[pages#stats-leetcode-stats]] | [[actions#get-leetcode-stats]] API; passes `slugToQuestionId` down to `RecentSolvedList` so the merged "Recently Solved" view can link to local question pages |
| `SubmissionHeatmap` | `submission-heatmap.tsx` | — | [[pages#stats-leetcode-stats]] | [[actions#get-leetcode-calendar]] API |
| `SkillBars` | `skill-bars.tsx` | — | [[pages#stats-leetcode-stats]] | — |
| `ContestStats` | `contest-stats.tsx` | — | [[pages#stats-leetcode-stats]] | — |
| `SolvedProgress` | `solved-progress.tsx` | — | [[pages#stats-leetcode-stats]] | — |
| `DailyProblemCard` | `daily-problem-card.tsx` | — | [[pages#stats-leetcode-stats]] | [[actions#get-leetcode-daily]] API |
| `LeetCodeUsernameForm` | `leetcode-username-form.tsx` | — | [[pages#dashboard-dashboard]], [[pages#stats-leetcode-stats]] | [[actions#profilets]], [[actions#sync]] |
| `EmailSubscriptionToggle` | `email-subscription-toggle.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#emailts]] |

### Codeforces
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `CodeforcesUserCard` | `codeforces-user-card.tsx` | `handle, rating?, maxRating?, rank?, maxRank?, avatar?, titlePhoto?, contribution, lastOnlineTimeSeconds?, registrationTimeSeconds?` | [[pages#codeforces-codeforces]] (rendered inside `CodeforcesProfile`) | [[actions#get-apicodeforcesuserhandle]] API |
| `RatingHistoryChart` | `rating-history-chart.tsx` | `data: { contestName, rating, date, rank }[]` | [[pages#codeforces-codeforces]] (rendered inside `CodeforcesProfile`) | [[actions#get-apicodeforcesratinghandle]] API; Recharts `LineChart` with CF rank tier reference lines |
| `ContestHistoryTable` | `contest-history-table.tsx` | `entries: ContestEntry[]` | [[pages#codeforces-codeforces]] (rendered inside `CodeforcesProfile`) | [[actions#get-apicodeforcesratinghandle]] API; shows contest name, rank, old/new rating, delta, date |
| `CodeforcesProfile` | `codeforces-profile.tsx` | `handle: string` | [[pages#codeforces-codeforces]] | Fetches both `/api/codeforces/user` and `/api/codeforces/rating`; renders `CodeforcesUserCard`, `RatingHistoryChart`, `ContestHistoryTable` |
| `CodeforcesUsernameForm` | `codeforces-username-form.tsx` | `initialValue?: string` | [[pages#dashboard-dashboard]], [[pages#codeforces-codeforces]] | [[actions#codeforcests]] `saveCodeforcesUsername` |

### Auth
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `LoginForm` | `auth/login-form.tsx` | — | [[pages#auth-group-auth]] `/login` | Better Auth `signIn.email()` |
| `RegisterForm` | `auth/register-form.tsx` | — | [[pages#auth-group-auth]] `/register` | Better Auth `signUp.email()` |

### Admin
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `AdminQuestionsForm` | `admin-questions-form.tsx` | — | [[pages#admin-adminquestions]] | [[actions#admints]] |

### Animation Components (React Bits) — [[architecture#tech-stack]]
| Component | File | Used On |
|-----------|------|---------|
| `BlurText` | `BlurText.tsx` | Landing page heading |
| `SplitText` | `SplitText.tsx` | Various headings |
| `AnimatedContent` | `AnimatedContent.tsx` | Content reveals |
| `SpotlightCard` | `SpotlightCard.tsx` | Card hover effects |
| `ShinyText` | `ShinyText.tsx` | Special text effects |

## UI Primitives (shadcn) — [`components/ui/`](components.md)
Button, Input, Badge, Tabs, Card, Checkbox, Textarea, Select, Skeleton, Separator, ScrollArea, Tooltip, Avatar, Dialog, Progress, Label.

Installed via `shadcn CLI`. Pattern: `import { Button } from "@/components/ui/button"` (see [[conventions#imports]]).

## Loading & Empty States

| Component | Loading | Empty | Used On |
|-----------|---------|-------|---------|
| CompanyGrid | 12 Skeleton cards | "No companies found" | [[pages#companies-list-companies]] |
| QuestionTable | 10 Skeleton rows | "No questions for this time period" | [[pages#company-detail-companiesslug]] |
| SearchResults | 5 Skeleton rows | "No results found for '{query}'" | [[pages#search-search]] |
| Dashboard Stats | Skeleton cards | "Start solving problems to see your progress!" | [[pages#dashboard-dashboard]] |
| CompanyProgress | Skeleton bars | "Solve some problems to track your progress" | [[pages#dashboard-dashboard]] |
| QuestionDetail (unauthenticated) | — | "Sign in to write notes and track progress." | [[pages#company-detail-companiesslug]] |
| CodeforcesProfile | 3 Skeleton cards | "Link your Codeforces account to view your stats" / error card with Retry button | [[pages#codeforces-codeforces]] |
| RatingHistoryChart | Empty card "No contest history available" | Empty card "No contest history available" | [[pages#codeforces-codeforces]] |
| ContestHistoryTable | Empty card "No contest history available" | Empty card "No contest history available" | [[pages#codeforces-codeforces]] |
