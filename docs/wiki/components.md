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
├── RecentActivity                     [[components#dashboard]]
├── CompanyProgress                    [[components#dashboard]]
├── LeetCodeStats                      [[components#dashboard]]
├── SubmissionHeatmap                  [[components#dashboard]]
├── SkillBars                          [[components#dashboard]]
├── ContestStats                       [[components#dashboard]]
├── SolvedProgress                     [[components#dashboard]]
├── DailyProblemCard                   [[components#dashboard]]
└── LeetCodeUsernameForm               [[components#dashboard]]

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
| `RecentSolvedList` | `recent-solved-list.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#getDashboardStats]] |

### Search
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `SearchBar` | `search-bar.tsx` | `className?, placeholder?` | [[pages#landing-page]], [[pages#search-search]] | Debounced 300ms → navigates to `/search?q=...` |
| `SearchResults` | `search-results.tsx` | `results[], query, loading?` | [[pages#search-search]] | [[actions#get-apisearchqpage1pagesize20]] |

### Dashboard
| Component | File | Props | Used On | Data Source |
|-----------|------|-------|---------|-------------|
| `StatsOverview` | `stats-overview.tsx` | `totalSolved, byDifficulty` | [[pages#dashboard-dashboard]] | [[actions#getDashboardStats]] |
| `RecentActivity` | `recent-activity.tsx` | `activity[]` | [[pages#dashboard-dashboard]] | [[actions#getDashboardStats]] |
| `LeetCodeStats` | `leetcode-stats.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#get-leetcode-stats]] API |
| `SubmissionHeatmap` | `submission-heatmap.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#get-leetcode-calendar]] API |
| `SkillBars` | `skill-bars.tsx` | — | [[pages#dashboard-dashboard]] | — |
| `ContestStats` | `contest-stats.tsx` | — | [[pages#dashboard-dashboard]] | — |
| `SolvedProgress` | `solved-progress.tsx` | — | [[pages#dashboard-dashboard]] | — |
| `DailyProblemCard` | `daily-problem-card.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#get-leetcode-daily]] API |
| `LeetCodeUsernameForm` | `leetcode-username-form.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#profilets]], [[actions#sync]] |
| `EmailSubscriptionToggle` | `email-subscription-toggle.tsx` | — | [[pages#dashboard-dashboard]] | [[actions#emailts]] |

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
| RecentActivity | 5 Skeleton rows | "No recent activity" | [[pages#dashboard-dashboard]] |
| CompanyProgress | Skeleton bars | "Solve some problems to track your progress" | [[pages#dashboard-dashboard]] |
| QuestionDetail (unauthenticated) | — | "Sign in to write notes and track progress." | [[pages#company-detail-companiesslug]] |
