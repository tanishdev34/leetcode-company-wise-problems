# LeetCode Company Tracker

> **Agent entry point** — read this first, then consult the wiki for details.

## Quick Start

```bash
bun install     # install dependencies
bun run dev     # start dev server at localhost:3000
bun run build   # typecheck + build
bun run lint    # ESLint
bun run format  # Prettier
```

## Project Wiki

This project has a maintained wiki at **`docs/wiki/`** containing comprehensive documentation. Every AI agent should read the relevant wiki pages before making changes.

| Page | Contents |
|------|----------|
| [`docs/wiki/index.md`](docs/wiki/index.md) | Wiki index, page catalog, and changelog |
| [`docs/wiki/architecture.md`](docs/wiki/architecture.md) | Overall architecture, tech stack, data flow |
| [`docs/wiki/data-model.md`](docs/wiki/data-model.md) | Prisma schema, models, relations, indexes |
| [`docs/wiki/pages.md`](docs/wiki/pages.md) | All routes, pages, URL params, auth requirements |
| [`docs/wiki/components.md`](docs/wiki/components.md) | UI components, their props, and what they render |
| [`docs/wiki/actions.md`](docs/wiki/actions.md) | Server actions, API routes, data flow |
| [`docs/wiki/configuration.md`](docs/wiki/configuration.md) | Environment variables, config files |
| [`docs/wiki/conventions.md`](docs/wiki/conventions.md) | Coding conventions, naming, styles, preferences |

## AI / LLM Configuration

This project uses **OpenRouter** as the LLM provider for AI analysis and interview coach features through the dedicated AI SDK provider (`@openrouter/ai-sdk-provider`).

| Endpoint | Type | Provider Package |
|----------|------|-----------------|
| `https://openrouter.ai/api/v1` | OpenRouter native | `@openrouter/ai-sdk-provider` |

The API key is read from `OPENROUTER_API_KEY`.
The active model is read from `OPENROUTER_MODEL` (default: `z-ai/glm-4.5`), so model changes don't require code edits.

> **Usage pattern**: A shared helper is configured in `lib/ai.ts` and imported by both workers. Both the analysis worker (`lib/analyze.ts`) and solution review worker (`lib/solution-review.ts`) use `getAiModel()` for model inference.

## Key Conventions

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **Package manager**: Bun
- **ORM**: Prisma 7 with PostgreSQL
- **Auth**: Better Auth (email/password + Google OAuth)
- **Styling**: Tailwind CSS v4
- **Server actions** in `actions/` — always return `ActionResult<T>` (discriminated union)
- **Components** in `components/` — client components use `"use client"` directive
- **Database** models in `prisma/schema.prisma` — generated client in `generated/prisma/`

## Wiki Maintenance

> **IMPORTANT**: After every change — whether adding a feature, fixing a bug, refactoring, renaming files, updating the schema, or modifying any part of the codebase — **you MUST update the wiki** (`docs/wiki/`) to reflect the changes. This includes:
>
> - Updated file paths or new files in the project structure
> - Modified data models or relations
> - New/changed routes, pages, or URL parameters
> - New/changed components, their props, or behavior
> - New/changed server actions or API routes
> - Updated dependencies or configuration
> - Any change in coding conventions or patterns
>
> The wiki is the single source of truth for agent understanding. An out-of-date wiki will cause future agents to make incorrect assumptions. Keep it current.

## Project Structure

```
.
├── AGENTS.md                 ← Start here
├── actions/                  # Next.js server actions
│   ├── questions.ts          # Question CRUD, toggle solved, notes
│   ├── stats.ts              # Dashboard statistics
│   ├── admin.ts              # Admin question import
│   ├── profile.ts            # LeetCode username save
│   ├── study-planner.ts      # Study plan CRUD
│   ├── review.ts             # Spaced repetition reviews
│   ├── readiness.ts          # Interview readiness scores
│   └── interview.ts          # Mock interview session lifecycle
├── app/                      # Next.js App Router pages + API
│   ├── (auth)/               # Login, Register
│   ├── (main)/               # Dashboard, Companies, Search, Questions, Admin
│   └── api/                  # Search, Sync, LeetCode proxy, Auth
├── components/               # React components
│   ├── ui/                   # shadcn UI primitives
│   ├── auth/                 # Login/Register forms
│   └── ...                   # Custom components
├── generated/prisma/         # Generated Prisma client (don't edit)
├── lib/                      # Utilities (db, auth, ai, redis, utils, offline)
├── emails/                  # React Email components (daily question, contest reminders)
├── docs/
│   ├── wiki/                 # Project wiki (this)
│   └── superpowers/          # Design specs & implementation plans
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # CSV import script
├── leetcode-extension/        # Browser extension
├── public/                   # Static assets (SW, PWA manifest)
└── middleware.ts             # Route protection
```
