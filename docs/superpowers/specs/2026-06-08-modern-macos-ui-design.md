# Modern macOS UI and Product Simplification Design

> **Status:** Planning only. Do not implement from this file directly until a coding agent creates and follows an implementation plan.
> **Intent:** Make the app feel like a fast, modern desktop-class study cockpit instead of a feature demo.

## Research Inputs

- [Supaste](https://www.supaste.com/) positions itself as a local-first macOS app with a visual history, quick search, app/type grouping, keyboard paste, a full library view, and privacy-first storage. The useful pattern for this project is not clipboard capture; it is the feeling of a native utility: instant search, compact shelf, grouped content, and no page feeling ornamental.
- [Browserbase](https://www.browserbase.com/) uses dense developer-product composition: strong first-viewport statement, sharp primitives, command-like flows, templates, observable runs, and "use the web like an API" style messaging. The useful pattern here is a product that turns complex workflows into visible, composable primitives.
- [Browserbase docs](https://docs.browserbase.com/fundamentals/create-browser-session) frame browser sessions as isolated, configurable units with recordings, logs, and viewport options. Borrow this structure for study sessions and roadmap runs: each serious workflow should have an inspectable lifecycle.
- Current app wiki shows many standalone destinations: dashboard, stats, Codeforces, planner, reviews, readiness, learning, memory, reports, playground, whiteboard, coach, interview, admin system map. This has become too wide for a personal productivity app.

## Product Direction

The app should become a native-feeling interview prep workspace with four core surfaces:

1. **Today**: the command center for what to solve now.
2. **Roadmaps**: generated, editable preparation plans for companies, topics, and deadlines.
3. **Library**: all questions, companies, topics, notes, solutions, and sync state in one searchable database.
4. **Coach**: review, interview, and mistake-memory feedback in one contextual assistant surface.

Everything else should either be folded into one of these surfaces, hidden as admin/dev tooling, or removed.

## Features to Remove, Merge, or De-emphasize

This is the main cleanup pass. A coding agent should audit usage before deleting files, but the intended product shape is:

| Current Surface | New Home | Recommendation |
|---|---|---|
| `/dashboard` | `/today` or `/` after auth | Replace with a compact native app home. Keep only study streak, active roadmap, due reviews, last sync, and next actions. |
| `/stats` | Profile drawer or Library inspector | Remove as a primary nav item. Stats should support decisions, not become a destination. |
| `/codeforces` | Profile drawer or later "Competitive" module | Remove from primary nav. Keep username linking only if it actively affects plans. |
| `/planner` | `/roadmaps` | Replace weekly manual planner with generated multi-roadmaps. Migrate useful `StudyPlan` data. |
| `/reviews` | Today queue and Roadmap calendar | Keep spaced repetition logic, remove as separate mental model unless power users need a filtered view. |
| `/readiness` | Roadmap detail and company inspector | Keep scoring as a compact readiness meter inside each company/roadmap. |
| `/learning` | Library graph mode or Coach insights | Hide from nav. Graphs are useful as drill-down, not a default tab. |
| `/memory` | Coach | Merge mistake memory into Coach as "Patterns". |
| `/reports` | Today weekly recap card | Collapse into one weekly review surface. Email/report generation can remain backend-only. |
| `/playground` | Question detail or Interview mode | Keep only where it helps solve a problem. Standalone playground is optional. |
| `/whiteboard` | Interview/question attachment | Keep as contextual scratchpad if used; remove standalone nav. |
| `/admin/system-map` | Admin-only hidden route | Keep for agents, never visible in main app nav. |
| Public marketing landing | Lightweight signed-out search/login | Do not spend engineering energy on marketing composition. This is a tool. |

## Visual System

Target aesthetic: **quiet, dense, native, precise**. Think macOS utility plus developer tool, not SaaS landing page.

### Layout

- Use a fixed desktop sidebar with sections: Today, Roadmaps, Library, Coach, Settings.
- Use a top command bar with global search, sync status, `Cmd+K`, and the active account.
- Use a right inspector panel for details instead of pushing users through page after page.
- Prefer split panes over nested cards.
- Use full-width bands or unframed panels; avoid cards inside cards.
- Keep repeated items as small rows with icons, status dots, and stable heights.

### Native App Feel

- Add command-first flows: create roadmap, sync now, jump to company, start focus session, review solution.
- Use segmented controls for filters, not large tab strips.
- Use icon buttons with tooltips for repeated actions.
- Add subtle spring-like transitions for pane changes, row selection, and inspector open/close.
- Add hover and active states that feel physical but restrained.
- Add loading skeletons that preserve row height.
- Add offline/sync states that look like system status, not warning banners unless action is required.

### Palette and Typography

- Avoid the current overuse of decorative gradients and glass panels.
- Use a neutral base with a few semantic accents:
  - green for solved/ready,
  - amber for due/stale,
  - red for blocked/hard,
  - blue/cyan for sync or external data,
  - magenta only as a rare highlight.
- Keep typography compact. Do not use hero-scale type inside app surfaces.
- Use existing app fonts unless a coding agent explicitly validates a better pair. Do not introduce font churn during the cleanup.

### Motion

- Use motion to show continuity, not decoration.
- Good motion: sidebar active indicator, row-to-inspector transition, command palette reveal, roadmap day expansion, sync progress.
- Bad motion: animated decorative backgrounds, floating orbs, large page reveal effects, gratuitous shimmer.

## New App Shell

### Sidebar

Primary items:

- Today
- Roadmaps
- Library
- Coach
- Settings

Secondary collapsed/admin items:

- Admin Questions
- System Map

The sidebar should show the active roadmap and due count as tiny badges. It should not list every feature.

### Command Bar

Persistent top strip:

- Global search input: questions, companies, topics, roadmaps, notes.
- Sync pill: "Synced 4m ago", "Syncing...", "Needs LeetCode username", or "Failed".
- `Cmd+K` button.
- Account/avatar menu.

### Inspector

Right-side panel used across app:

- Question details.
- Company readiness.
- Roadmap day detail.
- Review history.
- Solution/notes preview.
- Sync run logs.

This replaces many modal dialogs and standalone pages.

## Core Screens

### Today

Purpose: answer "what do I do now?"

Sections:

- Active roadmap progress.
- Today's exact questions.
- Due reviews.
- Last solved and streak.
- Sync status with one action.
- One coaching insight from recent mistakes.

Remove:

- Large stats dashboards.
- Big charts.
- Marketing copy.

### Roadmaps

Purpose: plan and execute interview prep.

Surface:

- Left: roadmap list.
- Center: calendar/timeline with daily question batches.
- Right: selected day/question inspector.
- Bottom or command palette: regenerate, rebalance, pause, duplicate.

This is detailed in `docs/superpowers/specs/2026-06-08-roadmap-planner-design.md`.

### Library

Purpose: searchable, filterable source of truth.

Modes:

- Questions table.
- Companies table.
- Topics table.
- Notes/solutions search.

Filters:

- Company.
- Topic.
- Difficulty.
- Solved status.
- Review due.
- In roadmap.
- Has solution.
- Has notes.

The Library absorbs most of Search, Companies, Stats, Learning Graph drill-down, and question browsing.

### Coach

Purpose: one place for feedback and memory.

Sections:

- Review latest solution.
- Mistake patterns.
- Mock interview sessions.
- Weekly recap.
- Suggested next focus.

Coach should not become a chatbot-first page by default. It should be a structured feedback workspace with optional conversational affordances.

## Implementation Strategy for Future Coding Agent

1. Create a route map proposal before deleting any code.
2. Build new app shell behind a feature flag or isolated branch.
3. Move navigation first without changing data behavior.
4. Build Today from existing actions.
5. Build Library as a unified question/company/topic browser.
6. Replace Planner with Roadmaps only after the roadmap data model exists.
7. Merge Coach surfaces after confirming no data is lost.
8. Remove orphaned routes, components, tests, and dependencies.
9. Update wiki pages after each implementation chunk.

## Dependency Cleanup Targets

A coding agent should verify imports before removal.

- Review heavy animation/visual packages: `@gsap/react`, `gsap`, `ogl`, `tw-animate-css`, React Bits usage mentioned in wiki.
- Keep `motion` if it becomes the single motion layer.
- Keep `@xyflow/react` only if graph/system-map remains useful.
- Keep `recharts` only for compact insight charts that remain in Today/Roadmaps/Profile.
- Keep Liveblocks only if collaboration is actually implemented. Otherwise remove it.

## Acceptance Criteria

- Primary nav has five or fewer user-facing destinations.
- A signed-in user can understand their next action in under five seconds.
- No page looks like a marketing landing page after login.
- All repeated study tasks are reachable from keyboard search or command palette.
- Stats, graph, memory, review, and report features support workflows contextually instead of competing as separate tabs.
- App remains responsive at laptop widths and feels dense but calm.
- Wiki accurately documents removed routes, merged components, and updated conventions.

