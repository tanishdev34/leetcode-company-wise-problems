# OpenRouter AI SDK Migration Design

> **Status:** Planning only. Do not implement from this file directly until a coding agent follows the implementation plan.
> **Goal:** Move AI inference from Crof's Anthropic-compatible endpoint to OpenRouter through the AI SDK, with the model ID controlled by `.env`.

## Current State

The app currently uses Crof AI through an Anthropic-compatible AI SDK provider:

- `lib/ai.ts` exports `crof = createAnthropic({ baseURL: "https://anthropic.nahcrof.com/v1", apiKey: process.env.CROF_API_KEY })`.
- `lib/analyze.ts` imports `crof` dynamically and calls `crof("glm-4.7-flash")`.
- `lib/solution-review.ts` imports `crof` dynamically and calls `crof("glm-4.7-flash")`.
- Docs reference `CROF_API_KEY` and `glm-4.7-flash` in `docs/wiki/configuration.md`, `docs/wiki/architecture.md`, `docs/wiki/actions.md`, `docs/wiki/data-model.md`, and `docs/wiki/index.md`.

This makes provider and model switching require code edits.

## Target State

Use OpenRouter as the single AI provider for app inference:

- Provider package: `@ai-sdk/openai` already exists in `package.json`.
- Provider factory: `createOpenAI` from `@ai-sdk/openai`.
- Base URL: `https://openrouter.ai/api/v1`.
- API key env: `OPENROUTER_API_KEY`.
- Model env: `OPENROUTER_MODEL`.
- Shared helper: `lib/ai.ts` exports a provider plus a function that returns the configured language model.

The model ID must not be hardcoded in workers. Changing `.env` should be enough to switch models.

## Research Notes

- AI SDK local docs for `@ai-sdk/openai` document `createOpenAI({ baseURL, apiKey, headers, name })` for customized OpenAI-compatible provider setup.
- OpenRouter's docs describe its API as similar to the OpenAI Chat API and expose models via `GET https://openrouter.ai/api/v1/models`.
- OpenRouter model IDs are strings such as `openai/gpt-4`, `google/gemini-2.5-pro-preview`, or other provider/model slugs. The exact default should be chosen by the user or verified against the OpenRouter models endpoint before implementation.
- OpenRouter supports optional attribution headers such as HTTP referrer/site title in many integration examples. These are useful but not required for the first migration.

## Environment Variables

Required:

```env
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="z-ai/glm-4.5"
```

Optional:

```env
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="LeetCode Company Tracker"
```

`OPENROUTER_MODEL` should be the only value a user needs to edit for routine model switching.

## Shared AI Module Design

Recommended `lib/ai.ts` shape:

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
  return openrouter.chat(OPENROUTER_MODEL)
}

export function getAiModelName() {
  return OPENROUTER_MODEL
}
```

Notes for the coding agent:

- Prefer `.chat(modelId)` because OpenRouter is OpenAI-compatible at the chat completions layer. Avoid the OpenAI Responses API path unless verified with OpenRouter.
- If AI SDK type errors show that `.chat` is no longer the right method for custom OpenAI-compatible models, inspect installed `@ai-sdk/openai` docs/source and adjust.
- Do not keep `crof` as the public export unless a temporary alias is needed for a transitional commit.

## Worker Changes

Both workers should import the configured model helper:

- `lib/analyze.ts`
- `lib/solution-review.ts`

Replace:

```typescript
const { crof } = await import("@/lib/ai")
// ...
model: crof("glm-4.7-flash")
```

With:

```typescript
const { getAiModel } = await import("@/lib/ai")
// ...
model: getAiModel()
```

Structured output usage with `generateText` and `Output.object({ schema })` should stay unchanged.

## Failure Behavior

If `OPENROUTER_API_KEY` is missing:

- The first model call should fail clearly.
- Prefer an explicit validation error in `getAiModel()` so job errors say `OPENROUTER_API_KEY is required for AI features`.
- Do not silently fall back to Crof.

If `OPENROUTER_MODEL` is missing:

- Use a documented fallback constant in `lib/ai.ts`.
- Log or expose the active model name in job diagnostics only if useful.

If OpenRouter rejects the model:

- Existing retry/backoff can remain.
- The error saved on `AnalysisJob` or `SolutionReview` should include enough detail for the user to fix `.env`.

## Documentation Updates

After implementation, update:

- `docs/wiki/configuration.md`
  - Replace Crof env docs with OpenRouter env docs.
- `docs/wiki/architecture.md`
  - Update AI Analysis and AI Interview Coach rows.
  - Update `lib/ai.ts`, `lib/analyze.ts`, and `lib/solution-review.ts` directory notes.
- `docs/wiki/actions.md`
  - Replace Crof mentions in `POST /api/analyze` and `POST /api/solution-review`.
- `docs/wiki/data-model.md`
  - Replace Crof worker descriptions.
- `docs/wiki/index.md`
  - Add changelog entry.
- `AGENTS.md` and `CLAUDE.md`
  - Replace the AI / LLM configuration section.

## Acceptance Criteria

- `CROF_API_KEY` is no longer required for AI analysis or solution review.
- `OPENROUTER_API_KEY` powers all existing AI SDK inference.
- `OPENROUTER_MODEL` controls the model without code changes.
- `lib/analyze.ts` and `lib/solution-review.ts` share the same configured model helper.
- Existing structured output behavior remains intact.
- Typecheck passes.
- Wiki and agent entry docs describe OpenRouter as the current provider.

