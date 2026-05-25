# Feature Ideas

This project is a playground for getting better at product engineering: sharper UI/UX, richer full-stack flows, more interesting data models, AI-assisted workflows, browser extension work, mobile polish, and production-grade engineering habits.

The goal is not to bolt on random features. Prefer additions that make the app a better interview-prep companion while teaching transferable skills.

## How To Use This File

- Pick features by the skill you want to practice next.
- Favor visible UX improvements when motivation is low.
- Favor data modeling, background jobs, tests, and integrations when you want deeper engineering practice.
- Use mature libraries where they teach real-world patterns.
- Keep every feature connected to LeetCode, Codeforces, interviews, study consistency, or competitive programming.

## Next Feature Wave — 2026-05-23

The first roadmap wave is implemented. The next wave should push the project into deeper interaction models: canvas-based learning, agentic workflows, code execution, learning memory, durable background jobs, and stronger local-first behavior.

### Whiteboard Interview Mode

- **Difficulty:** Hard
- **Libraries to try:** [`tldraw`](https://github.com/tldraw/tldraw), [`@excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw), optional Liveblocks/Yjs for collaboration
- **Build:** Add a whiteboard workspace inside `/interview` and question detail pages. Users can draw system-design diagrams, trace DSA state transitions, sketch recursion trees, and save diagrams per question or interview session.
- **Teaches:** Infinite canvas UI, drawing tools, persisted canvas state, export flows, real-time collaboration, visual problem solving.
- **Data model ideas:** `Whiteboard`, `WhiteboardSnapshot`, `questionId`, `interviewSessionId`, `canvasJson`, `previewImageUrl`, `updatedAt`.
- **Why it fits:** You already have interview sessions and notes. A whiteboard makes the app useful for system design, visual DSA, and richer mock interviews.

### In-Browser Code Runner And Test Playground

- **Difficulty:** Hard
- **Libraries to try:** [WebContainers](https://webcontainers.io/guides/introduction), CodeMirror, Monaco Editor, `vitest`
- **Build:** Let users write JavaScript/TypeScript solutions, create custom test cases, run AI-generated test harnesses, and compare outputs without leaving the app.
- **Teaches:** Sandboxed execution, browser runtimes, test harness design, editor UX, security boundaries.
- **Data model ideas:** `CodeRun`, `TestCase`, `RunResult`, language, stdout, stderr, status, runtimeMs.
- **Why it fits:** You already store code and run AI reviews. Executable practice makes the app feel much closer to a real interview environment.

### Agentic Study Copilot

- **Difficulty:** Hard
- **Libraries to try:** [`assistant-ui`](https://github.com/assistant-ui/assistant-ui), [`CopilotKit`](https://github.com/CopilotKit/CopilotKit), [`Mastra`](https://github.com/mastra-ai/mastra), AI SDK
- **Build:** Add an in-app copilot that can answer questions and take approved actions: plan my week, find weak graph problems, move these to review, create a mock interview, summarize my progress, or explain why a question is due.
- **Teaches:** Agent tools, human-in-the-loop approvals, structured AI output, generative UI, chat UX, safe mutation design.
- **Data model ideas:** `CopilotThread`, `CopilotMessage`, `CopilotAction`, action status (`proposed`/`approved`/`applied`/`rejected`).
- **Why it fits:** The app has enough user context now for an assistant to do useful work rather than generic chat.

### Knowledge Graph Of Learning

- **Difficulty:** Medium to Hard
- **Libraries to try:** [`@xyflow/react`](https://github.com/xyflow/xyflow), `dagre`, `recharts`
- **Build:** Create an interactive graph that connects topics, companies, questions, solved attempts, review due dates, and weak areas. Let users click from a weak topic to recommended questions and related companies.
- **Teaches:** Graph data modeling, node-based UI, derived analytics, interactive visualization, layout algorithms.
- **Data model ideas:** Start derived-only from existing data; later persist `TopicRelation`, `LearningNode`, or user-specific graph snapshots.
- **Why it fits:** The app already has topics, companies, reviews, readiness scores, and AI feedback. A graph can make those connections visible.

### Personal Mistake Memory

- **Difficulty:** Hard
- **Libraries to try:** AI SDK embeddings, `pgvector`, structured outputs, optional Mastra memory
- **Build:** Turn wrong attempts, hint reveals, review reflections, coach feedback, and interview ratings into a searchable memory layer. The coach can say, "You often miss binary-search boundary cases" or "You improved on DP state definition this week."
- **Teaches:** Retrieval, embeddings, summarization, longitudinal user modeling, privacy-aware AI memory.
- **Data model ideas:** `LearningMemory`, `MistakePattern`, `MemorySource`, embedding vector, confidence, lastSeenAt.
- **Why it fits:** This is the natural next step after reviews and AI feedback: make the app remember how the user learns.

### Durable Workflow Engine

- **Difficulty:** Medium to Hard
- **Libraries to try:** [`Trigger.dev`](https://automationatlas.io/tools/trigger-dev/), Inngest, BullMQ
- **Build:** Move long-running and scheduled work into durable workflows: AI reviews, reminders, daily emails, import jobs, sync jobs, notification fan-out, and weekly summaries.
- **Teaches:** Durable background jobs, retries, observability, idempotency, workflow design, failure recovery.
- **Data model ideas:** `WorkflowRun`, `WorkflowEvent`, `WorkflowAttempt`, or use the platform dashboard as the source of truth.
- **Why it fits:** The app already has cron, AI jobs, retries, imports, and sync. A real workflow layer will make it easier to grow safely.

### Voice Mock Interviewer

- **Difficulty:** Hard
- **Libraries to try:** Web Speech API, OpenAI Realtime or speech APIs, LiveKit, `assistant-ui`
- **Build:** Add voice-based mock interviews where the AI asks follow-ups, listens to explanations, scores communication, and saves transcripts plus feedback.
- **Teaches:** Voice UX, streaming AI, transcript handling, rubric design, latency management.
- **Data model ideas:** `InterviewTranscript`, `InterviewTurn`, `SpeechAssessment`, `communicationScore`, `clarityScore`.
- **Why it fits:** Product Hunt interview-prep tools are moving toward voice and realistic interviews; this would make your existing interview room much more alive.

### AI Generated Study Reports

- **Difficulty:** Medium
- **Libraries to try:** CopilotKit generative UI, `recharts`, React Email
- **Build:** Generate weekly study reports with charts, mistake summaries, plan changes, due reviews, readiness movement, and recommended next actions. Render them in-app and optionally email them.
- **Teaches:** Narrative analytics, report generation, AI-to-UI mapping, scheduled jobs, email/product consistency.
- **Data model ideas:** `StudyReport`, `reportPeriodStart`, `reportPeriodEnd`, `summaryJson`, `emailedAt`.
- **Why it fits:** You already collect enough data to tell a meaningful weekly story.

### Accessibility And Design-System Mastery Pass

- **Difficulty:** Medium
- **Libraries to try:** [`react-aria-components`](https://react-aria.adobe.com/getting-started), shadcn blocks, Storybook/Ladle, Axe
- **Build:** Audit complex interactions like command palette, planner, review queue, interview room, forms, and future whiteboard controls. Add accessible primitives, stories, keyboard tests, and visual state docs.
- **Teaches:** Accessibility engineering, reusable component design, keyboard UX, regression prevention.
- **Why it fits:** The app is becoming interaction-heavy. Accessibility work will make the UI feel mature rather than just feature-rich.

### Codebase Intelligence Map

- **Difficulty:** Medium
- **Libraries to try:** ReactGraph-style analysis, `ts-morph`, `@xyflow/react`
- **Build:** Create an internal `/admin/system-map` page that visualizes routes, components, actions, API routes, models, and wiki docs. Use it to help future agents and yourself understand the project.
- **Teaches:** static analysis, AST parsing, developer tooling, graph UI, documentation automation.
- **Why it fits:** This project has many moving parts now. A codebase map would be both useful and a very cool meta-feature.

## Next Suggested Build Order

1. **Whiteboard Interview Mode** — biggest visible upgrade to interviews and system design.
2. **Agentic Study Copilot** — turns existing features into an intelligent workflow.
3. **Knowledge Graph Of Learning** — makes hidden relationships between topics, companies, reviews, and readiness visible.
4. **In-Browser Code Runner And Test Playground** — adds serious coding-practice depth.
5. **Personal Mistake Memory** — makes AI feedback compound over time.
6. **AI Generated Study Reports** — packages progress into a weekly narrative.
7. **Durable Workflow Engine** — strengthens the backend as jobs multiply.
8. **Voice Mock Interviewer** — ambitious interview realism once the copilot and workflow layer are stronger.
9. **Accessibility And Design-System Mastery Pass** — hardens the growing UI.
10. **Codebase Intelligence Map** — meta-tooling for maintaining the project as it grows.

## Quick Wins

### Command Palette

- **Difficulty:** Easy
- **Libraries to try:** `cmdk`, `lucide-react`
- **Build:** Add a keyboard-driven palette for jumping to companies, questions, dashboard, stats, Codeforces, and admin pages.
- **Teaches:** Keyboard UX, fuzzy navigation, accessible dialogs, shortcut handling.
- **Why it fits:** The app already has many destinations. A command palette makes it feel faster and more polished.

### Better Empty States

- **Difficulty:** Easy
- **Libraries to try:** existing shadcn/ui primitives, `lucide-react`, small CSS animations
- **Build:** Replace plain empty/error states with useful recovery actions: link username, sync LeetCode, add notes, search companies, retry failed API calls.
- **Teaches:** Product writing, state design, error recovery, UI hierarchy.
- **Why it fits:** Empty states are where side projects often feel unfinished.

### Keyboard-First Question Table

- **Difficulty:** Easy to Medium
- **Libraries to try:** `@tanstack/react-table`, `react-hotkeys-hook`
- **Build:** Let users move through rows with arrow keys, open details with Enter, toggle solved with Space, and jump to notes.
- **Teaches:** Accessibility, focus management, complex interactive lists.
- **Why it fits:** Interview prep involves repetitive scanning and tracking; keyboard support makes that workflow feel serious.

### Notes Templates

- **Difficulty:** Easy
- **Libraries to try:** `react-markdown`, existing `NoteEditor`
- **Build:** Add templates such as "Pattern / Intuition / Complexity / Mistakes", "Brute force to optimal", and "Interview explanation".
- **Teaches:** UX defaults, markdown editing, user workflow design.
- **Why it fits:** Notes become more valuable when the app nudges users toward structured reflection.

## Frontend And UI/UX Skill Builders

### Study Planner

- **Difficulty:** Medium
- **Libraries to try:** `dnd-kit`, `react-hook-form`, `zod`, `date-fns`
- **Build:** Let users create a weekly study plan by dragging questions into days, setting target difficulty mix, and marking planned items complete.
- **Teaches:** Drag-and-drop, form validation, scheduling logic, optimistic UI.
- **Data model ideas:** `StudyPlan`, `StudyPlanItem`, planned date, status, notes.
- **Why it fits:** It turns the tracker from a passive database into an active study tool.

### Spaced Repetition Review Queue

- **Difficulty:** Medium
- **Libraries to try:** `date-fns`, shadcn `Dialog`, `Progress`, maybe `sonner` for toasts
- **Build:** After solving a question, ask confidence level and schedule reviews using simple intervals like 1 day, 3 days, 7 days, 21 days.
- **Teaches:** Product loops, state machines, date math, recurring task UX.
- **Data model ideas:** `ReviewItem`, `nextReviewAt`, `confidence`, `reviewCount`, `lastReviewedAt`.
- **Why it fits:** Solving once is not enough; retention is the real game.

### Focus Mode

- **Difficulty:** Medium
- **Libraries to try:** `motion`, `use-sound`, `date-fns`
- **Build:** A distraction-free solving screen with timer, problem link, notes, hints, code area, and session recap.
- **Teaches:** Immersive UI design, timers, local state persistence, polished interaction states.
- **Data model ideas:** `StudySession`, duration, questionId, outcome, reflection.
- **Why it fits:** It creates a complete practice loop instead of scattered pages.

### Question Browser 2.0

- **Difficulty:** Medium
- **Libraries to try:** `@tanstack/react-table`, `nuqs`, `cmdk`
- **Build:** Replace or enhance question lists with sortable/filterable columns for difficulty, topics, frequency, solved status, company count, and review due date.
- **Teaches:** Advanced tables, URL state, server/client filtering tradeoffs.
- **Why it fits:** The current company pages are useful, but a power-user browser would make the dataset feel alive.

### Design System Cleanup Pass

- **Difficulty:** Medium
- **Libraries to try:** `tailwind-variants`, shadcn/ui, Storybook or Ladle
- **Build:** Create reusable UI patterns for stat cards, page headers, empty states, loading states, action bars, and form rows.
- **Teaches:** Component API design, consistency, visual systems, design debt control.
- **Why it fits:** This project already has many independent surfaces; a small design system will keep future features coherent.

## Data Visualization And Analytics

### Interview Readiness Score

- **Difficulty:** Medium
- **Libraries to try:** `recharts`, `date-fns`
- **Build:** Score readiness per company using solved count, recency, difficulty coverage, topic coverage, and review freshness.
- **Teaches:** Product metrics, weighting algorithms, explainable scoring UI.
- **Data model ideas:** May start derived-only; persist snapshots later if useful.
- **Why it fits:** Company tracking becomes more meaningful when users know how prepared they are.

### Topic Weakness Detector

- **Difficulty:** Medium
- **Libraries to try:** `recharts`, `@tanstack/react-table`
- **Build:** Show topics where the user has low solved coverage, stale reviews, or repeated hint usage.
- **Teaches:** Aggregation queries, charts, actionable analytics, drill-down UX.
- **Why it fits:** "What should I study next?" is the core question.

### Unified Competitive Profile

- **Difficulty:** Medium
- **Libraries to try:** `recharts`, `motion`
- **Build:** Merge LeetCode and Codeforces into one profile view with activity, rating, solved distribution, recent work, and consistency.
- **Teaches:** API normalization, cross-source data design, dashboard composition.
- **Why it fits:** The app already has LeetCode and Codeforces; combining them creates a stronger identity.

### Progress Timeline

- **Difficulty:** Medium
- **Libraries to try:** `recharts`, `visx`, or `nivo`
- **Build:** Visualize solving history, reviews, contests, streaks, and major milestones on a timeline.
- **Teaches:** Time-series modeling, chart storytelling, responsive visualization.
- **Why it fits:** A good timeline makes progress emotionally visible.

## AI And Code Intelligence

### AI Interview Coach

- **Difficulty:** Hard
- **Libraries to try:** AI SDK `generateObject`, `zod`, existing queued analysis jobs
- **Build:** Analyze a saved solution and return feedback on correctness, complexity, edge cases, explanation quality, and follow-up questions.
- **Teaches:** Structured AI output, prompt design, background jobs, model UX.
- **Data model ideas:** Extend `AnalysisJob` or add `SolutionReview`.
- **Why it fits:** The app already stores code and has AI analysis plumbing.

### Solution Comparison

- **Difficulty:** Hard
- **Libraries to try:** `diff`, `react-diff-viewer`, AI SDK
- **Build:** Compare the user's solution against an ideal approach or a past version, highlighting complexity and conceptual differences.
- **Teaches:** Diff UI, versioning, AI-assisted explanation, code review UX.
- **Data model ideas:** `SolutionVersion`, submitted code, language, notes.
- **Why it fits:** It turns notes into a learning archive.

### Hint Ladder

- **Difficulty:** Medium
- **Libraries to try:** AI SDK structured output, shadcn `Accordion`
- **Build:** Generate progressive hints: nudge, pattern, key observation, pseudocode, edge cases. Reveal one at a time.
- **Teaches:** Progressive disclosure, AI safety against spoilers, structured generation.
- **Why it fits:** Interview prep needs help that does not immediately give away the answer.

### Natural Language Search

- **Difficulty:** Hard
- **Libraries to try:** `pgvector`, AI SDK embeddings, Postgres
- **Build:** Search questions by intent: "sliding window with duplicates", "Google graph medium", "DP with intervals".
- **Teaches:** Embeddings, vector search, hybrid search, query UX.
- **Why it fits:** The database has enough question metadata to make semantic search useful.

## Browser Extension Features

### One-Click Capture With Tags

- **Difficulty:** Medium
- **Libraries to try:** WXT, existing extension stack
- **Build:** From a LeetCode problem page, capture code, language, notes, confidence, tags, and whether to schedule a review.
- **Teaches:** Extension messaging, content scripts, cross-origin auth, compact UX.
- **Why it fits:** The extension can become the fastest way to keep the tracker updated.

### Inline Problem Overlay

- **Difficulty:** Hard
- **Libraries to try:** WXT, Shadow DOM, `@floating-ui/react`
- **Build:** Show a small overlay on LeetCode pages with local solved status, company frequency, due reviews, and quick notes.
- **Teaches:** Browser extension UI isolation, injected interfaces, robust selectors.
- **Why it fits:** It brings the tracker into the place where solving actually happens.

### Submission Reflection Prompt

- **Difficulty:** Medium
- **Libraries to try:** WXT, existing API routes
- **Build:** After accepted submissions, prompt the user to write what they learned and optionally schedule a review.
- **Teaches:** Event detection, lightweight habit loops, extension-to-app sync.
- **Why it fits:** The best learning moment is right after solving.

## Mobile And PWA Ideas

### Mobile Study Companion

- **Difficulty:** Medium
- **Libraries to try:** Capacitor, existing mobile folder, native share APIs
- **Build:** Polish the mobile shell for reviewing notes, due reviews, daily problem, streaks, and quick stats.
- **Teaches:** Hybrid mobile, responsive UI, native wrapper constraints.
- **Why it fits:** Mobile is better for review and planning than heavy coding.

### Offline Review Mode

- **Difficulty:** Hard
- **Libraries to try:** PWA service workers, IndexedDB, `idb-keyval`
- **Build:** Cache due reviews, notes, and question metadata so users can review offline and sync later.
- **Teaches:** Offline-first state, sync conflicts, service worker caching.
- **Why it fits:** Great production engineering practice with real user value.

### Push Notifications

- **Difficulty:** Hard
- **Libraries to try:** Web Push, Capacitor notifications, Vercel cron
- **Build:** Send review reminders, daily question prompts, and contest alerts through web or mobile push.
- **Teaches:** permission UX, notification scheduling, cron jobs, cross-platform differences.
- **Why it fits:** Email already exists; push is a natural next notification channel.

## Backend, Systems, And Production Practice

### Background Job Dashboard

- **Difficulty:** Medium
- **Libraries to try:** existing Prisma models, shadcn table, `date-fns`
- **Build:** Admin UI to inspect analysis jobs, retries, failures, and processing time.
- **Teaches:** operational tooling, job state modeling, admin UX.
- **Why it fits:** The project already has `AnalysisJob`; visibility makes it feel production-grade.

### Import Pipeline V2

- **Difficulty:** Hard
- **Libraries to try:** `bullmq` or Inngest, CSV parser, Zod validation
- **Build:** Add preview, validation, deduplication, progress tracking, rollback, and import history for question CSV uploads.
- **Teaches:** background queues, data validation, admin workflows, idempotency.
- **Why it fits:** Data quality matters in a tracker app.

### Observability Pass

- **Difficulty:** Medium
- **Libraries to try:** Sentry, OpenTelemetry, Vercel Analytics
- **Build:** Add error tracking, API latency logging, cron/job failure alerts, and user-safe error boundaries.
- **Teaches:** production debugging, monitoring, error boundaries.
- **Why it fits:** It upgrades the app from hobby code to something maintainable.

### Test Suite Foundation

- **Difficulty:** Medium
- **Libraries to try:** Vitest, Testing Library, Playwright, MSW
- **Build:** Add tests for server actions, API routes, core components, and one end-to-end flow like "sync solved questions".
- **Teaches:** testing strategy, mocks, fixtures, confidence during refactors.
- **Why it fits:** Bigger side projects become painful without tests.

## Social And Collaboration Ideas

### Public Profile Page

- **Difficulty:** Medium
- **Libraries to try:** Next.js metadata, Recharts, shadcn components
- **Build:** Let users share a public profile with solved stats, topic strengths, streaks, Codeforces rating, and featured notes.
- **Teaches:** public/private data boundaries, profile design, SEO basics.
- **Why it fits:** It gives the app a shareable output without needing full social networking.

### Mock Interview Room

- **Difficulty:** Hard
- **Libraries to try:** Liveblocks, Yjs, Monaco Editor, WebRTC or daily.co
- **Build:** Create a shared room with a question, timer, collaborative code area, notes, and interviewer feedback.
- **Teaches:** real-time collaboration, presence, conflict resolution, session UX.
- **Why it fits:** It is ambitious, portfolio-worthy, and close to the interview-prep mission.

### Study Groups

- **Difficulty:** Hard
- **Libraries to try:** Prisma relations, invitation links, activity feeds
- **Build:** Let users form groups, assign weekly question sets, and compare progress.
- **Teaches:** multi-user permissions, group data modeling, activity feeds.
- **Why it fits:** Accountability makes study tools stickier, but it is a larger commitment.

## Suggested Build Order

1. ~~Command Palette~~ ✅ — fast polish and immediate app-wide quality.
2. ~~Notes Templates~~ ✅ — improves the existing question workflow.
3. ~~Study Planner~~ ✅ — first meaningful new data model.
4. ~~Spaced Repetition Review Queue~~ ✅ — turns solved history into a learning loop.
5. ~~Interview Readiness Score~~ ✅ — makes analytics actionable.
6. ~~AI Interview Coach~~ ✅ — builds on existing AI job infrastructure.
7. ~~Extension Inline Overlay~~ ✅ — deepens extension skills and makes the app feel integrated.
8. ~~Test Suite Foundation~~ ✅ — protects the growing project.
9. ~~Offline Review Mode~~ ✅ — advanced frontend systems practice.
10. ~~Mock Interview Room~~ ✅ — large capstone feature.

## Library Shortlist

| Area                    | Libraries                                              |
| ----------------------- | ------------------------------------------------------ |
| Forms and validation    | `react-hook-form`, `zod`                               |
| Tables and filtering    | `@tanstack/react-table`, `nuqs`                        |
| Drag and drop           | `dnd-kit`                                              |
| Command palette         | `cmdk`                                                 |
| Charts                  | `recharts`, `visx`, `nivo`                             |
| Dates and scheduling    | `date-fns`                                             |
| AI                      | AI SDK `generateObject`, embeddings, structured output |
| Code editing            | Monaco Editor, CodeMirror                              |
| Diffing                 | `diff`, `react-diff-viewer`                            |
| Testing                 | Vitest, Testing Library, Playwright, MSW               |
| Jobs and workflows      | Inngest, BullMQ                                        |
| Observability           | Sentry, OpenTelemetry                                  |
| Offline storage         | IndexedDB, `idb-keyval`                                |
| Real-time collaboration | Liveblocks, Yjs                                        |

## Feature Quality Checklist

Before calling a feature done:

- It has loading, empty, error, and success states.
- It works on mobile and desktop.
- It has keyboard and screen-reader basics covered.
- It uses the existing auth and `ActionResult<T>` patterns where relevant.
- It updates `docs/wiki/` when routes, actions, components, models, or conventions change.
- It includes focused tests if the feature touches persistence, API routes, auth, or important user workflows.
