# OpenRouter AI SDK Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Crof AI with OpenRouter through the AI SDK, with the model selected from `OPENROUTER_MODEL`.

**Architecture:** Keep all AI calls behind `lib/ai.ts`. Use `@ai-sdk/openai`'s customized OpenAI-compatible provider with OpenRouter's base URL, then update analysis and solution-review workers to call a shared `getAiModel()` helper instead of hardcoding provider/model pairs.

**Tech Stack:** Next.js 16, TypeScript, AI SDK `ai`, `@ai-sdk/openai`, OpenRouter OpenAI-compatible API, Bun.

**Spec:** `docs/superpowers/specs/2026-06-08-openrouter-ai-sdk-design.md`

---

## File Structure

- Modify: `lib/ai.ts` — replace Crof provider with OpenRouter provider and model helpers.
- Modify: `lib/analyze.ts` — use `getAiModel()` instead of `crof("glm-4.7-flash")`.
- Modify: `lib/solution-review.ts` — use `getAiModel()` instead of `crof("glm-4.7-flash")`.
- Modify: `docs/wiki/configuration.md` — document `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, optional OpenRouter vars.
- Modify: `docs/wiki/architecture.md` — update AI provider references.
- Modify: `docs/wiki/actions.md` — update analyze/review worker descriptions.
- Modify: `docs/wiki/data-model.md` — update AI job worker descriptions.
- Modify: `docs/wiki/index.md` — add changelog entry.
- Modify: `AGENTS.md` and `CLAUDE.md` — update AI / LLM configuration.
- Test or verify: `bun run typecheck`.

## Task 1: Update Shared AI Provider

**Files:**
- Modify: `lib/ai.ts`

- [ ] **Step 1: Inspect installed AI SDK provider docs**

Run:

```bash
sed -n '38,110p' node_modules/@ai-sdk/openai/docs/03-openai.mdx
```

Expected: docs show `createOpenAI`, `baseURL`, `apiKey`, optional headers, and provider invocation methods.

- [ ] **Step 2: Replace Crof provider with OpenRouter provider**

Edit `lib/ai.ts` to:

```typescript
import { createOpenAI } from "@ai-sdk/openai"

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.5"

export const openrouter = createOpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    ...(process.env.OPENROUTER_SITE_URL
      ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
      : {}),
    ...(process.env.OPENROUTER_APP_NAME
      ? { "X-Title": process.env.OPENROUTER_APP_NAME }
      : {}),
  },
})

export function getAiModel() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required for AI features")
  }

  return openrouter.chat(OPENROUTER_MODEL)
}

export function getAiModelName() {
  return OPENROUTER_MODEL
}
```

- [ ] **Step 3: Run a focused TypeScript check**

Run:

```bash
bun run typecheck
```

Expected: if `.chat(...)` is valid, typecheck passes or only fails on unrelated existing worktree changes. If `.chat(...)` is invalid, inspect `node_modules/@ai-sdk/openai/docs/03-openai.mdx` and `node_modules/@ai-sdk/openai/src` for the current method, then update `getAiModel()` accordingly.

- [ ] **Step 4: Commit**

```bash
git add lib/ai.ts
git commit -m "chore: configure OpenRouter AI provider"
```

## Task 2: Move Workers to Shared Model Helper

**Files:**
- Modify: `lib/analyze.ts`
- Modify: `lib/solution-review.ts`

- [ ] **Step 1: Update analysis worker import**

In `lib/analyze.ts`, replace:

```typescript
const { crof } = await import("@/lib/ai")
```

With:

```typescript
const { getAiModel } = await import("@/lib/ai")
```

- [ ] **Step 2: Update analysis worker model call**

In `lib/analyze.ts`, replace:

```typescript
model: crof("glm-4.7-flash"),
```

With:

```typescript
model: getAiModel(),
```

- [ ] **Step 3: Update solution-review worker import**

In `lib/solution-review.ts`, replace:

```typescript
const { crof } = await import("@/lib/ai")
```

With:

```typescript
const { getAiModel } = await import("@/lib/ai")
```

- [ ] **Step 4: Update solution-review worker model call**

In `lib/solution-review.ts`, replace:

```typescript
model: crof("glm-4.7-flash"),
```

With:

```typescript
model: getAiModel(),
```

- [ ] **Step 5: Search for stale Crof usage**

Run:

```bash
rg -n "crof|CROF|glm-4\\.7-flash|createAnthropic|anthropic\\.nahcrof" lib actions app
```

Expected: no application code references remain. Documentation references will be handled in Task 4.

- [ ] **Step 6: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: AI worker imports and model calls typecheck.

- [ ] **Step 7: Commit**

```bash
git add lib/analyze.ts lib/solution-review.ts
git commit -m "refactor: use configured AI model in workers"
```

## Task 3: Validate OpenRouter Model Configuration

**Files:**
- No required code changes unless validation exposes a model-method mismatch.

- [ ] **Step 1: Choose a default model**

Use OpenRouter's models endpoint or web UI to choose the default model ID.

Run:

```bash
curl -sS https://openrouter.ai/api/v1/models | jq -r '.data[].id' | rg 'glm|z-ai|deepseek|openai|anthropic' | head -30
```

Expected: list of valid model IDs. Pick one and set `OPENROUTER_MODEL` in local `.env`.

- [ ] **Step 2: Add local env vars**

Update local `.env` only; do not commit secrets:

```env
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="z-ai/glm-4.5"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="LeetCode Company Tracker"
```

- [ ] **Step 3: Run an AI feature manually**

Start the app:

```bash
bun run dev
```

Then enqueue either:

- AI analysis from a question detail page.
- AI solution review from Coach.

Expected: job reaches `done`, structured output is saved, and no Crof env var is needed.

- [ ] **Step 4: Check failure clarity**

Temporarily unset `OPENROUTER_API_KEY` in local dev and trigger an AI job.

Expected: job fails with `OPENROUTER_API_KEY is required for AI features`.

## Task 4: Update Documentation and Agent Entry Files

**Files:**
- Modify: `docs/wiki/configuration.md`
- Modify: `docs/wiki/architecture.md`
- Modify: `docs/wiki/actions.md`
- Modify: `docs/wiki/data-model.md`
- Modify: `docs/wiki/index.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update configuration env docs**

In `docs/wiki/configuration.md`, replace the Crof section:

```env
# AI Analysis — used by [[actions#post-apianalyze]] (admin feature, background queue)
# Crof AI endpoint (Anthropic-compatible): https://anthropic.nahcrof.com/v1 — model: glm-4.7-flash
CROF_API_KEY="nahcrof_..."
```

With:

```env
# AI Analysis — used by [[actions#post-apianalyze]] and [[actions#post-apisolution-review]]
# OpenRouter via AI SDK @ai-sdk/openai. Change OPENROUTER_MODEL to switch models.
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="z-ai/glm-4.5"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="LeetCode Company Tracker"
```

- [ ] **Step 2: Update architecture docs**

Replace Crof references with OpenRouter references:

- AI Analysis row.
- AI Interview Coach row.
- Directory layout comments for `lib/ai.ts`, `lib/analyze.ts`, `lib/solution-review.ts`.

Expected wording:

```markdown
OpenRouter via AI SDK (`@ai-sdk/openai`, shared model helper in `lib/ai.ts`; model selected by `OPENROUTER_MODEL`)
```

- [ ] **Step 3: Update actions docs**

In `docs/wiki/actions.md`, update:

- `POST /api/analyze`
- `POST /api/solution-review`

Expected: both say the worker calls OpenRouter through `getAiModel()` from `lib/ai.ts`.

- [ ] **Step 4: Update data model docs**

In `docs/wiki/data-model.md`, update worker descriptions for:

- `AnalysisJob`
- `SolutionReview`

- [ ] **Step 5: Update agent entry docs**

In `AGENTS.md` and `CLAUDE.md`, replace the AI / LLM Configuration section with:

```markdown
## AI / LLM Configuration

This project uses **OpenRouter** as the LLM provider for AI analysis and interview coach features through the AI SDK's OpenAI-compatible provider (`@ai-sdk/openai`).

| Endpoint | Type | Provider Package |
|----------|------|-----------------|
| `https://openrouter.ai/api/v1` | OpenAI-compatible | `@ai-sdk/openai` via `createOpenAI({ baseURL })` |

The API key is read from `OPENROUTER_API_KEY`.
The active model is read from `OPENROUTER_MODEL`, so model changes should not require code edits.
```

- [ ] **Step 6: Add changelog entry**

In `docs/wiki/index.md`, add a top changelog entry:

```markdown
### [2026-06-08] OpenRouter AI SDK migration plan
- Added design and implementation plan docs for moving AI analysis and solution review from Crof to OpenRouter through `@ai-sdk/openai`.
- Planned `OPENROUTER_MODEL` so model switching can happen from `.env` without code changes.
```

- [ ] **Step 7: Commit docs**

```bash
git add docs/wiki/configuration.md docs/wiki/architecture.md docs/wiki/actions.md docs/wiki/data-model.md docs/wiki/index.md AGENTS.md CLAUDE.md
git commit -m "docs: document OpenRouter AI configuration"
```

## Task 5: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Search for stale provider references**

Run:

```bash
rg -n "CROF|crof\\(|glm-4\\.7-flash|createAnthropic|anthropic\\.nahcrof" .
```

Expected: no active code references. Historical docs may remain only if intentionally preserved in changelog text.

- [ ] **Step 2: Search for OpenRouter references**

Run:

```bash
rg -n "OPENROUTER|OpenRouter|getAiModel|createOpenAI" lib docs AGENTS.md CLAUDE.md
```

Expected: shared AI module, docs, and entry files consistently reference OpenRouter.

- [ ] **Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 4: Run relevant tests if present**

Run:

```bash
bun run test
```

Expected: pass, or document unrelated failures clearly.

- [ ] **Step 5: Final commit**

If Task 1-4 were not committed separately:

```bash
git add lib/ai.ts lib/analyze.ts lib/solution-review.ts docs/wiki/configuration.md docs/wiki/architecture.md docs/wiki/actions.md docs/wiki/data-model.md docs/wiki/index.md AGENTS.md CLAUDE.md
git commit -m "chore: migrate AI provider to OpenRouter"
```

## Notes for Coding Agent

- Do not introduce `@openrouter/sdk`; the request is to use AI SDK only.
- Do not hardcode provider/model pairs in workers.
- Do not commit real `.env` secrets.
- Do not remove `@ai-sdk/anthropic` until a separate dependency cleanup confirms nothing imports it.
- Keep existing retry/backoff behavior unchanged unless the OpenRouter errors require a tiny compatibility fix.

