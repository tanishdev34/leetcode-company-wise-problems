# Conventions

> **See also:** [[architecture]] | [[actions]] | [[components]]

## Coding Standards

### TypeScript
- Strict mode enabled — see `tsconfig.json` ([[configuration#config-files]])
- Use explicit types for function parameters and return types
- Prefer `interface` over `type` for object shapes
- Use `type` for unions and utility types (e.g., `ActionResult<T>` in [[actions]])
- Avoid `any` — use `unknown` when type is truly unknown

### React/Next.js
- Server components by default (no `"use client"`)
- Client components only when interactivity is needed (event handlers, hooks, state)
- Server actions in `actions/` directory, each file for a domain — see [[actions]]
- All server actions return `ActionResult<T>` discriminated union — see [[actions#server-actions]]
- Client components use `useSession()` from Better Auth for auth state — see [[components#auth]]

### Naming
| Pattern | Example | Context |
|---------|---------|---------|
| Files: `kebab-case.ts` | `question-row.tsx` | All source files |
| Components: `PascalCase` | `QuestionRow`, `DifficultyBadge` | [[components]] |
| Functions/variables: `camelCase` | `getCompanyQuestions`, `solvedSet` | [[actions]] |
| Constants: `UPPER_SNAKE_CASE` | `THIRTY_DAYS`, `ALL` | [[data-model#enums]] |
| Server action files: plural nouns | `questions.ts`, `stats.ts` | [[actions]] |

### Imports
```typescript
// Absolute imports with @/ alias
import { Button } from "@/components/ui/button"   // [[components#ui-primitives-shadcn]]
import { prisma } from "@/lib/db"                  // [[data-model]]

// Relative imports for nearby files
import { QuestionRow } from "./question-row"        // [[components#questions]]
```
See `tsconfig.json` path aliases in [[configuration#config-files]].

### Styling
- Tailwind CSS v4 utility classes — see [[architecture#tech-stack]]
- shadcn components use `cn()` utility for conditional classes
- Dark mode via `next-themes` and Tailwind's `dark:` variant
- Custom animations in `components/` ([[components#animation-components-react-bits]])

## Project Structure Rules

- **Server actions** in `actions/` — one file per domain. See [[actions]].
- **Components** in `components/` — flat structure for custom components, `ui/` for shadcn, `auth/` for auth forms. See [[components]].
- **Pages** in `app/` — route groups `(auth)` and `(main)` separate concerns. See [[pages]].
- **API routes** in `app/api/` — organized by domain. See [[actions#api-routes]].
- **Utilities** in `lib/` — db, auth, redis, utils. See [[architecture#directory-layout]].
- **Wiki** in `docs/wiki/` — agent-facing documentation. This file.
- **Design docs** in `docs/superpowers/` — specs and implementation plans.

## State Management

- No global state library — server state is fetched via [[actions]] or API routes
- Component-local state via `useState`/`useReducer`
- Auth state via Better Auth's `useSession()` hook (see [[components#auth]])
- URL search params for pagination and filters (bookmarkable state) — see [[pages#url-parameter-details]]

## Patterns

### Server Action Pattern
```typescript
"use server"

export async function myAction(params: T): Promise<ActionResult<R>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { success: false, error: "Not authenticated" }

    // ... business logic ...
    // See [[actions]] for concrete examples

    return { success: true, data: result }
  } catch {
    return { success: false, error: "Human-readable error message" }
  }
}
```
Applied in: [[actions#questionsts]], [[actions#actionsstatsts]], [[actions#admints]], [[actions#profilets]].

### Client Component Data Fetching Pattern
```typescript
const [data, setData] = useState<Data | null>(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  setLoading(true)
  getData(params)
    .then((result) => {
      if (result.success) setData(result.data)
    })
    .finally(() => setLoading(false))
}, [params])
```
Applied in: [[pages#company-detail-companiesslug]], [[pages#search-search]], [[pages]].

### Notes Pattern
- Auto-save with debounce (1 second) — see `NoteEditor` in [[components#questions]]
- Save on blur
- Markdown preview toggle
- Status indicator: idle → saving → saved (2s) → idle
- Error state with retry button
- Max 10,000 characters — validated in [[actions#saveNotes]]

## Git Conventions

- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.)
- No direct pushes to main — feature branches with PRs
- `.env` is in `.gitignore` — never commit secrets (see [[configuration#environment-variables]])
- Generated files in `generated/` are not committed
- Format before commit: `bun run format` (uses Prettier with `prettier-plugin-tailwindcss`)

## Current Preferences

- Use `bun` for package management and scripts (see [[configuration#package-scripts]])
- `bun run dev` uses Turbopack for fast development
- `postinstall` hook auto-generates Prisma client (see [[configuration#package-scripts]])
- Format before commit (Prettier with `prettier-plugin-tailwindcss`)

## LeetCode URL Normalization

All `leetcodeUrl` values stored in the database **must** be normalized (trailing slashes stripped) to prevent duplicate `Question` records. Use the `normalizeLeetcodeUrl()` helper from `lib/utils.ts`:

```typescript
import { normalizeLeetcodeUrl } from "@/lib/utils"
const url = normalizeLeetcodeUrl(`https://leetcode.com/problems/${slug}/`)
```

**Applies to:** seed script (`prisma/seed.ts`), admin actions (`actions/admin.ts`), extension API (`app/api/extension/add-solution/route.ts`), sync API (`app/api/sync/route.ts`).
