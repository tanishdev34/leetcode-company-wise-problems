# Components

> **See also:** [[pages]] | [[actions]] | [[architecture]]

## New Components (v2 — May 2026)

```
Interview Room (/interview)                  [[pages]]
└── InterviewRoom                            [[components#interview-room]]
    ├── Setup phase
    │   ├── Difficulty select (Easy/Medium/Hard/Random)
    │   └── Duration select (15/30/45/60 min)
    ├── Interview phase
    │   ├── Countdown timer (urgent when < 5 min)
    │   ├── Question card (title, difficulty, topics, LeetCode link)
    │   ├── Notes textarea
    │   └── Complete/Cancel buttons
    ├── Rating phase
    │   ├── 1-5 star self-rating
    │   └── Reflection textarea
    ├── Recap phase
    │   ├── Session summary (question, duration, rating)
    │   └── Recent history preview
    └── History (always visible in setup)
        └── Past session list with status/duration/rating
```

```
Planner (/planner)                         [[pages]]
└── StudyPlanner                           [[components#studyplanner]]
    ├── Plan list (sidebar card)
    │   └── Plan cards → select → show detail
    └── Plan detail view
        ├── Day sections (Sunday–Saturday)
        │   ├── Add Question button → Dialog with search
        │   └── Question items with checkbox + delete
        └── Delete plan button

Reviews (/reviews)                         [[pages]]
└── ReviewQueue                            [[components#reviewqueue]]
    ├── Stats cards (due, total, up-to-date)
    ├── Progress bar
    └── Review card
        ├── Question title + difficulty + review count
        └── Confidence buttons (1–5)

Readiness (/readiness)                     [[pages]]
└── ReadinessScores                        [[components#readinessscores]]
    ├── Overall score card (Progress bar)
    └── Company list
        └── Per-company cards → link to /companies/[slug]

Learning Graph (/learning)                 [[pages]]
└── LearningGraphView                      [[components#learning-graph]]
    ├── Weak/strong topic summary cards
    ├── Review pressure card
    └── React Flow graph (topic → question → company)

Reports (/reports)                         [[pages]]
└── StudyReportView                        [[components#study-reports]]
    ├── Weekly metric cards
    ├── Highlights
    ├── Recommended next actions
    ├── Company focus
    └── Topic momentum

Mistake Memory (/memory)                   [[pages]]
└── MistakeMemoryView                      [[components#mistake-memory]]
    ├── Recurring mistake patterns
    └── Recommended next moves

Code Playground (/playground)               [[pages]]
└── CodePlaygroundView                     [[components#code-playground]]
    ├── JavaScript and C++ language tabs
    ├── solve(...) / void solve() editor
    ├── JSON test case editor
    └── Per-case JS output or C++ compiler/runtime output

Whiteboard (/whiteboard)                    [[pages]]
└── WhiteboardView                         [[components#whiteboard]]
    ├── SVG drawing surface
    ├── Color/width controls
    └── localStorage save/restore

Admin System Map (/admin/system-map)        [[pages]]
└── SystemMapView                          [[components#system-map]]
    ├── Architecture summary cards
    └── React Flow graph (layers → files)

Global (all pages)
└── CommandPalette (in Navbar)             [[components#commandpalette]]
    ├── Cmd+K / Ctrl+K trigger button
    └── CommandDialog with search + page items
```

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
| `Navbar` | `navbar.tsx` | — | All [[pages#main-group-main]] routes | Uses `useSession()`, renders auth buttons/nav. Desktop authenticated nav omits the top-nav search input, keeps primary destinations visible, moves secondary destinations into a More menu, and pins admin/sign-out actions on the right without horizontal scrolling. |
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

### Study Planner
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `StudyPlanner` | `study-planner.tsx` | — | [[pages]] `/planner` | [[actions#studyplanner]] `getStudyPlans()`, `getStudyPlanDetail()`, `createStudyPlan()`, `addPlanItem()`, `updatePlanItemStatus()`, `removePlanItem()`, `deleteStudyPlan()`, `searchQuestionsForPlan()` |

### Offline Banner
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `OfflineBanner` | `offline-banner.tsx` | — | Global (root layout) | `navigator.onLine` + `online`/`offline` events |

**States:**
- **Online:** renders nothing
- **Offline:** fixed bottom-right amber toast: "Offline — showing cached data" with pulsing dot

### Review Queue
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `ReviewQueue` | `review-queue.tsx` | — | [[pages]] `/reviews` | [[actions#reviewts]] `getDueReviews()`, `getReviewStats()`, `scheduleReview()`, [[architecture#libofflinets]] `cacheReviews()`, `getCachedReviews()` (offline fallback) |

**Offline behavior:** When `getDueReviews()` fails and `navigator.onLine` is `false`, the component loads cached reviews from IndexedDB via `getCachedReviews()` and shows an inline "Offline — showing cached data" indicator with the last-synced timestamp.

### Readiness Scores
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `ReadinessScores` | `readiness-scores.tsx` | — | [[pages]] `/readiness` | [[actions#readinessts]] `getReadinessScores()` |

### Learning Graph
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `LearningGraphView` | `learning-graph-view.tsx` | — | [[pages]] `/learning` | [[actions#actionslearning-graphts]] `getLearningGraph()` |

### Study Reports
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `StudyReportView` | `study-report-view.tsx` | — | [[pages]] `/reports` | [[actions#actionsstudy-reportts]] `getWeeklyStudyReport()` |

### Mistake Memory
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `MistakeMemoryView` | `mistake-memory-view.tsx` | — | [[pages]] `/memory` | [[actions#actionsmistake-memoryts]] `getMistakeMemory()` |

### Code Playground
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `CodePlaygroundView` | `code-playground-view.tsx` | — | [[pages]] `/playground` | `lib/code-playground.ts`, `POST /api/playground/cpp`, `lib/cpp-playground.ts` |

### Whiteboard
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `WhiteboardView` | `whiteboard-view.tsx` | — | [[pages]] `/whiteboard` | `lib/whiteboard.ts` + localStorage |

### System Map
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `SystemMapView` | `system-map-view.tsx` | — | [[pages]] `/admin/system-map` | [[actions#actionssystem-mapts]] `getSystemMap()` |

### Command Palette
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `CommandPalette` | `command-palette.tsx` | `isAdmin?: boolean, isAuthenticated?: boolean` | [[components#layout]] Navbar | — (static page list, includes `/learning`, `/reports`, and admin `/admin/system-map`) |

### Interview Room
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `InterviewRoom` | `interview-room.tsx` | — | [[pages]] `/interview` | [[actions#actionsinterviewts]] `startInterview()`, `completeInterview()`, `cancelInterview()`, `getInterviewHistory()`, `getRandomQuestion()` |

**Phases:**
- **Setup:** Difficulty select (empty=Random, EASY, MEDIUM, HARD) + Duration select (15/30/45/60 min) + "Start Interview" button. History list of past sessions visible below.
- **Interview:** Countdown timer (pulses red when < 5 min), question card with title/difficulty/topics/LeetCode link, notes textarea, Complete/Cancel buttons. Session auto-ends when timer hits 0.
- **Rating:** 1-5 star rating + optional reflection textarea, "Save & View Recap" / "Skip" buttons.
- **Recap:** Session summary with question title, elapsed duration, star rating, reflection text, LeetCode link, and recent history preview.

**States:**
- **Error banner:** Red card with alert icon and dismiss button (shown on top in any phase)
- **History loading:** Centered spinner
- **History empty:** "No interviews yet. Start your first session!"
- **History populated:** Session cards with status badges (completed/cancelled/in_progress), difficulty badges, rating stars, dates

### AI Interview Coach
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `AiInterviewCoach` | `ai-interview-coach.tsx` | `questionId: string, code: string, language: string, initialReview?: SolutionReview` | [[pages]] `/coach` | [[actions#post-apisolution-review]], [[actions#get-apisolution-review]] (polling) |
| `AiInterviewCoachWrapper` | `app/(main)/coach/coach-wrapper.tsx` | — | [[pages]] `/coach` | [[actions#get-apisearchqpage1pagesize20]], [[actions#get-apiquestioncode]], [[actions#get-apisolution-review]] |

**States:**
- **Empty:** "Search for a question above to review your solution"
- **No code:** "No saved code found. Save your solution code on the question page first."
- **Loading/reviewing:** Card with spinner and "Analyzing your solution..."
- **Error:** Red card with error message and retry suggestion
- **Done:** Correctness badge (green/yellow/red) + Complexity cards + Explanation card + Suggestions card + Edge case tags + Expandable follow-up questions

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
