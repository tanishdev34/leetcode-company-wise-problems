# LeetCode Company Tracker

> **Claude entry point** — this file mirrors [`AGENTS.md`](./AGENTS.md). Read both before making changes.

## Quick Start

```bash
bun install     # install dependencies
bun run dev     # start dev server at localhost:3000
bun run build   # typecheck + build
bun run lint    # ESLint
bun run format  # Prettier
```

## Project Wiki

The wiki at **`docs/wiki/`** is the single source of truth. Read the relevant pages before editing.

| Page | Contents |
|------|----------|
| [`docs/wiki/index.md`](docs/wiki/index.md) | Wiki index, page catalog, changelog |
| [`docs/wiki/architecture.md`](docs/wiki/architecture.md) | Overall architecture, tech stack, data flow |
| [`docs/wiki/data-model.md`](docs/wiki/data-model.md) | Prisma schema, models, relations, indexes |
| [`docs/wiki/pages.md`](docs/wiki/pages.md) | All routes, pages, URL params, auth requirements |
| [`docs/wiki/components.md`](docs/wiki/components.md) | UI components, props, behavior |
| [`docs/wiki/actions.md`](docs/wiki/actions.md) | Server actions, API routes, data flow |
| [`docs/wiki/configuration.md`](docs/wiki/configuration.md) | Environment variables, config files |
| [`docs/wiki/conventions.md`](docs/wiki/conventions.md) | Coding conventions, naming, styles |

## Key Conventions

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **Package manager**: Bun
- **ORM**: Prisma 7 with PostgreSQL (client output: `generated/prisma/`)
- **Auth**: Better Auth (email/password + Google OAuth)
- **Styling**: Tailwind CSS v4
- **Server actions** in `actions/` — always return `ActionResult<T>` (discriminated union)
- **API routes** in `app/api/` — use for long-running / fire-and-forget work (see `app/api/analyze/` for the `after()` + DB-job pattern used for AI analysis)
- **Background jobs** — when a server-side task may outlive the request, persist a job row, schedule the worker via `next/server` `after()`, and have the client poll. See [[actions#post-apianalyze]] and [[data-model#analysisjob-ai-analysis-queue]].
- **Components** in `components/` — client components use `"use client"`

## Wiki Maintenance

> **IMPORTANT**: After every change — feature, bugfix, refactor, rename, schema update — **update `docs/wiki/`** to reflect it. This includes:
>
> - Updated file paths or new files in the project structure
> - Modified data models or relations
> - New/changed routes, pages, or URL parameters
> - New/changed components, their props, or behavior
> - New/changed server actions or API routes
> - Updated dependencies or configuration
> - Any change in coding conventions or patterns
>
> The wiki is the single source of truth for agent understanding. An out-of-date wiki causes future agents to make incorrect assumptions.

## Project Structure

```
.
├── AGENTS.md                 ← Generic agent entry point
├── CLAUDE.md                 ← Claude-specific entry point (this file)
├── actions/                  # Next.js server actions
│   ├── questions.ts          # Question CRUD, toggle solved, notes/code/hints
│   ├── stats.ts              # Dashboard statistics
│   ├── admin.ts              # Admin question import
│   ├── email.ts              # Email subscription toggle
│   └── profile.ts            # LeetCode username save
├── app/                      # Next.js App Router pages + API
│   ├── (auth)/               # Login, Register
│   ├── (main)/               # Dashboard, Companies, Search, Questions, Admin
│   └── api/                  # search, sync, leetcode proxy, auth,
│                             #   analyze (AI background queue), cron/*
├── components/               # React components
│   ├── ui/                   # shadcn UI primitives
│   ├── auth/                 # Login/Register forms
│   └── ...                   # Custom components
├── generated/prisma/         # Generated Prisma client (don't edit)
├── lib/                      # Utilities (db, auth, redis, email, analyze)
├── docs/
│   ├── wiki/                 # Project wiki
│   └── superpowers/          # Design specs & implementation plans
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # CSV import script
├── public/                   # Static assets
└── middleware.ts             # Route protection
```
