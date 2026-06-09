# Future Design Docs

> **See also:** [[index]] | [[architecture]] | [[pages]] | [[components]] | [[actions]] | [[data-model]]

This page tracks planning-only design documents that future coding agents should consult before implementing the next product cleanup wave.

## June 2026 Product Cleanup Wave

| Design Doc | Purpose | Implementation Notes |
|---|---|---|
| [`2026-06-08-modern-macos-ui-design.md`](../superpowers/specs/2026-06-08-modern-macos-ui-design.md) | Redesign the app into a native-feeling macOS-style workspace and reduce primary navigation to Today, Roadmaps, Library, Coach, and Settings. | Coding agents should create a separate implementation plan before changing routes/components. Includes route consolidation and dependency cleanup targets. |
| [`2026-06-08-roadmap-planner-design.md`](../superpowers/specs/2026-06-08-roadmap-planner-design.md) | Replace the manual weekly planner with multiple generated company/topic/deadline roadmaps that assign exact questions per day. | Requires new roadmap models or a migration from `StudyPlan`/`StudyPlanItem`. Should update Today and sync flows. |
| [`2026-06-08-leetcode-graphql-sync-design.md`](../superpowers/specs/2026-06-08-leetcode-graphql-sync-design.md) | Replace `alfa-leetcode-api` sync with direct LeetCode GraphQL calls and hydrate missing questions immediately. | LeetCode GraphQL is unofficial, so implementation must validate live queries and add defensive parsing, cache, retries, and partial-history warnings. |
| [`2026-06-08-openrouter-ai-sdk-design.md`](../superpowers/specs/2026-06-08-openrouter-ai-sdk-design.md) | Move AI analysis and solution review from Crof to OpenRouter through the AI SDK, with model selection controlled by `OPENROUTER_MODEL`. | Follow [`2026-06-08-openrouter-ai-sdk-migration.md`](../superpowers/plans/2026-06-08-openrouter-ai-sdk-migration.md) before editing code. |

## Research References

- [Supaste](https://www.supaste.com/) is the main reference for native macOS utility feel: local-first posture, visual history, grouped content, quick search, keyboard-first retrieval, and a compact library.
- [Browserbase](https://www.browserbase.com/) is the main reference for modern developer-product density: primitives, templates, live run/status concepts, and composable workflow language.
- [Browserbase sessions docs](https://docs.browserbase.com/fundamentals/create-browser-session) are useful as a pattern for inspectable study/sync/roadmap runs.
- [Trigger.dev docs](https://trigger.dev/docs) and [Inngest durable execution docs](https://www.inngest.com/docs/learn/how-functions-are-executed) are candidates for future durable background jobs if sync, reports, and AI workflows outgrow `next/server` `after()`.
- [PostHog GitHub](https://github.com/PostHog/posthog) is a candidate for feature flags, product analytics, and session replay during the navigation redesign.
- [OpenRouter docs](https://openrouter.ai/docs/api-reference/overview) describe an OpenAI-compatible API surface, and [OpenRouter models docs](https://openrouter.ai/docs/guides/overview/models) document `GET /api/v1/models` for model IDs that can be placed in `OPENROUTER_MODEL`.
- LeetCode GraphQL query examples are community-sourced and unofficial. Future agents should verify operations against `https://leetcode.com/graphql` before relying on them.

## Agent Rule

These docs are not implementation plans. Before coding, create a plan in `docs/superpowers/plans/` with exact files, tests, migration strategy, and wiki updates.
