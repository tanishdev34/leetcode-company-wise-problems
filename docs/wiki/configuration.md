# Configuration

> **See also:** [[architecture]] | [[data-model]] | [[actions]]

## Environment Variables

```env
# Database — used by [[data-model]] via [[configuration#prisma]]
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Better Auth — used by [[configuration#better-auth]] for [[components#auth]]
BETTER_AUTH_SECRET="random-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth — used by [[configuration#better-auth]] for [[components#auth]] social login
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Redis — used by [[actions#api-routes]] for caching LeetCode API responses
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# AI — used by analysis, solution review, and bounded roadmap question selection
OPENROUTER_API_KEY="..."
OPENROUTER_MODEL="deepseek/deepseek-v4-pro"

# SMTP (for email reminders via [[actions#daily-question-cron]] and [[actions#contest-reminder-cron]])
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="LeetCode Tracker <noreply@leetcode-tracker.com>"

# Cron security — set a random string in production
CRON_SECRET=development
```

## Config Files

| File | Purpose | Used By |
|------|---------|---------|
| `next.config.mjs` | Next.js config (headers for service worker + PWA manifest) | [[architecture#pwa--offline-support]] |
| `tsconfig.json` | TypeScript config — path aliases (`@/` → `./`) | [[conventions#imports]] |
| `tailwind.config.ts` | Tailwind CSS v4 config | [[conventions#styling]] |
| `postcss.config.mjs` | PostCSS config (Tailwind, autoprefixer) | [[architecture]] |
| `eslint.config.mjs` | ESLint config | [[conventions]] |
| `.prettierrc` | Prettier config | [[conventions#git-conventions]] |
| `components.json` | shadcn component configuration | [[components#ui-primitives-shadcn]] |
| `middleware.ts` | Next.js route protection middleware | [[pages#route-protection]] |
| `prisma.config.ts` | Prisma configuration | [[data-model]] |
| `vercel.json` | Vercel deployment config including cron jobs | [[actions#daily-question-cron]], [[actions#contest-reminder-cron]] |

## Package Scripts

| Script | Command | Purpose | Related |
|--------|---------|---------|---------|
| `dev` | `next dev --turbopack` | Development server | [[architecture]] |
| `build` | `next build` | TypeScript check + production build | [[conventions]] |
| `start` | `next start` | Start production server | — |
| `lint` | `eslint` | Lint all files | [[conventions]] |
| `format` | `prettier --write "**/*.{ts,tsx}"` | Format all TypeScript files | [[conventions#git-conventions]] |
| `typecheck` | `tsc --noEmit` | Type check without emitting | [[conventions]] |
| `smoke:openrouter` | `tsx scripts/openrouter-routing-smoke.ts` | Sends one tiny request through `lib/ai.ts` and prints OpenRouter provider metadata for routing verification | [[configuration#external-services]] |
| `postinstall` | `bun prisma generate` | Auto-generate Prisma client after install | [[data-model]] |
| `db:seed` | `npx prisma db seed` | Run CSV import seed script | [[data-model#seed-script]] |

## Notable UI Dependencies

| Package | Purpose | Used By |
|---------|---------|---------|
| `@xyflow/react` | Interactive node graph rendering | [[components#learning-graph]], [[components#system-map]] |

## External Services

| Service | Purpose | Used By | Configuration |
|---------|---------|---------|---------------|
| OpenRouter `https://openrouter.ai/api/v1` | LLM provider for structured AI analysis, solution review, and bounded roadmap question selection | `lib/ai.ts`, `lib/analyze.ts`, `lib/solution-review.ts`, `lib/roadmap-ai-planner.ts` | `OPENROUTER_API_KEY` (model id is hardcoded in `lib/ai.ts` as `deepseek/deepseek-v4-pro`); `lib/ai.ts` pins OpenRouter routing to `provider.only: ["deepseek"]` with `allow_fallbacks: true`. The shared helper wraps the model with two AI SDK middlewares: (1) a `transformParams` middleware that downgrades structured-output requests from `response_format: json_schema` to `json_object` — DeepSeek rejects `json_schema` ("This response_format type is unavailable now"), so the schema is moved into the prompt instead; and (2) `extractJsonMiddleware()` so any fenced JSON still parses with `Output.object()`. Roadmaps ask the model for a selected candidate-ID list with a 60-second timeout; date scheduling and persistence stay local. |
| Wandbox `https://wandbox.org/api/compile.json` | Remote C++ compile/run service using GCC for playground tests | [[actions#post-apiplaygroundcpp]], [[components#code-playground]] | No env var currently; `app/api/playground/cpp/route.ts` posts directly with `compiler: "gcc-head"` and `options: "warning,gnu++20"` |

## Prisma

- **Schema**: `prisma/schema.prisma` — full details in [[data-model]]
- **Generated client**: `generated/prisma/` (custom output path)
- **Seed script**: `prisma/seed.ts` — reads CSV files from company directories (see [[data-model#seed-script]])
- **Migration**: `npx prisma migrate dev`
- **Database**: PostgreSQL (Neon/Supabase)
- **Client singleton**: `lib/db.ts` — used by all [[actions]]

## Search Index

PostgreSQL `pg_trgm` extension is required for fuzzy search (see [[actions#get-apisearchqpage1pagesize20]]). The index is created manually:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY idx_question_title_trgm ON "Question" USING gin(title gin_trgm_ops);
```

This must be run outside of a transaction (not through Prisma migrations). The index enables the [[actions#get-apisearchqpage1pagesize20]] endpoint used by [[components#search]].

## Better Auth

| Setting | Value | Related |
|---------|-------|---------|
| Provider | email/password + Google OAuth | [[components#auth]] |
| Session expiry | 7 days | [[pages#route-protection]] |
| Session update age | 1 day | — |
| Database adapter | Prisma with PostgreSQL | [[data-model#user]], [[data-model#session]], [[data-model#account]] |
| Handles | sign in, sign up, sign out, session management, OAuth callbacks | [[components#auth]] |

Better Auth's Prisma models (`User`, `Session`, `Account`, `Verification`) are defined in [[data-model]]. The auth config is in `lib/auth.ts` (server) and `lib/auth-client.ts` (client).
