# LeetCode GraphQL Sync and Question Hydration Design

> **Status:** Planning only. No code changes in this document.
> **Goal:** Replace the `alfa-leetcode-api` dependency in sync flows with direct LeetCode GraphQL calls, and hydrate missing questions immediately when solved submissions are synced.

## Current Problem

The wiki currently documents `POST /api/sync` as fetching accepted submissions from `alfa-leetcode-api`, matching them to local `Question` rows, and only auto-importing missing questions for admins through another alfa endpoint.

Desired behavior:

- When the user syncs solved questions, the app should use LeetCode GraphQL directly.
- If a solved question is not in the local database, fetch its question details immediately from LeetCode GraphQL and insert it.
- The browser extension should remain responsible for saving the user's solution code, because public profile sync does not expose the user's actual solution code.

## Research Notes

LeetCode does not appear to publish a stable public GraphQL contract for third-party applications. Existing examples and libraries use `https://leetcode.com/graphql` with operations observed from LeetCode's own frontend.

Useful references:

- Stack Overflow examples show `recentAcSubmissionList(username, limit)` returning `id`, `title`, `titleSlug`, and `timestamp`, plus profile progress queries such as `userProfileUserQuestionProgressV2` and `matchedUser.submitStats` against `https://leetcode.com/graphql`.
- Community query collections such as [`akarsh1995/leetcode-graphql-queries`](https://github.com/akarsh1995/leetcode-graphql-queries) include `questionList` and problem detail query patterns.
- Fetcher documentation such as [`fetch-leetcode-problem`](https://rossmassey.github.io/fetch-leetcode-problem/database.html) notes that LeetCode GraphQL routes commonly use `titleSlug` for problem details.
- Apify's LeetCode GraphQL actor describes direct extraction against `https://leetcode.com/graphql/` with operations for profiles, question details, submission history, and problem lists.

Because the endpoint is unofficial, implementation must be defensive: small queries, rate limiting, cache, retries, and a fallback error message that asks the user to retry later.

## Sync Flow

1. User links LeetCode username.
2. User clicks sync, or app runs a scheduled sync.
3. Server creates a `SyncRun` record or logs an event.
4. Server calls LeetCode GraphQL for accepted submissions.
5. For each accepted submission:
   - Normalize `titleSlug`.
   - Find local `Question` by `leetcodeUrl` or `titleSlug`.
   - If missing, call LeetCode GraphQL `question(titleSlug)` to hydrate details.
   - Insert `Question`.
   - Upsert `UserQuestion` with `solved: true`, `solvedAt`.
6. Sync updates roadmap items, review schedule, and Today.
7. UI shows a concise sync summary.

## GraphQL Operations to Validate

The coding agent must validate these queries against the live endpoint before implementation.

### Recent Accepted Submissions

Use for incremental sync and quick refresh.

```graphql
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
```

Limitation: this is likely recent-only. It may not recover a complete historical solved set.

### User Progress Counts

Use for summary validation after sync.

```graphql
query userSessionProgress($username: String!) {
  allQuestionsCount {
    difficulty
    count
  }
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
```

### Question Hydration

Use when a synced solved slug is missing locally.

```graphql
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    acRate
    isPaidOnly
    topicTags {
      name
      slug
    }
  }
}
```

Do not store premium content, problem statement HTML, or solution text in the first pass. Store metadata only.

## Full Historical Sync Strategy

The first coding pass should avoid pretending to have a perfect full-history API unless validated.

Recommended approach:

1. Use `recentAcSubmissionList` for regular incremental sync.
2. Use profile solved counts to detect mismatch between LeetCode's accepted count and local solved count.
3. If mismatch exists, show "Recent sync complete, historical import incomplete" with a link to a manual/historical sync action.
4. Coding agent may investigate a paginated `submissionList` or accepted-submissions operation, but must verify it live and document rate limits before relying on it.
5. Keep browser extension as fallback for exact problem/solution capture.

## Data Model Additions

### `Question.titleSlug`

Add a stable slug field to avoid reconstructing from URLs.

- `titleSlug`: string, unique if present.

Backfill from existing `leetcodeUrl`.

### `SyncRun`

Track sync health.

- `id`
- `userId`
- `provider`: `leetcode`
- `status`: `pending`, `running`, `done`, `error`
- `startedAt`
- `finishedAt`
- `matchedCount`
- `importedCount`
- `skippedCount`
- `error`
- `metadata`: JSON

This powers the sync status pill in the modern UI.

## API Design

Replace current sync implementation behind the same route first:

- `POST /api/sync`
  - Auth required.
  - Body: `{ username?: string, mode?: "recent" | "historical" }`.
  - Defaults to saved username and `recent`.
  - Returns `{ synced, matched, imported, skipped, runId, warning? }`.

Add optional run inspection:

- `GET /api/sync?runId=...`
  - Auth required.
  - Returns sync run status and summary.

## Extension Boundary

Keep this clean:

- GraphQL sync marks solved questions and hydrates question metadata.
- Extension saves actual solution code and language.
- Extension may call existing overlay/toggle endpoints.
- Do not use browser automation to read code from LeetCode during sync.

## Error Handling

Cases:

- Username not found.
- GraphQL returns errors.
- LeetCode rate limits or blocks request.
- Question is paid-only.
- Question has no local company association.
- Recent submissions do not cover historical solved count.

Responses should be explicit but calm:

- "Synced 18 recent solves. 3 new questions imported. Your LeetCode profile shows more solved questions than local history; run historical import or keep using the extension for older items."

## Testing Requirements for Future Coding Agent

- Unit tests for slug normalization.
- Unit tests for GraphQL response parsing.
- Unit tests for question hydration mapping.
- Integration tests for sync route with mocked GraphQL responses.
- Regression test that synced unknown question creates `Question` and `UserQuestion`.
- Regression test that extension solution saving still works independently.

## Acceptance Criteria

- `POST /api/sync` no longer calls `alfa-leetcode-api`.
- Recently accepted questions sync from LeetCode GraphQL.
- Missing synced questions are inserted immediately with title, slug, difficulty, acceptance rate, topics, URL, and no company association.
- Existing solved questions are upserted without duplication.
- Roadmap progress updates after sync.
- UI exposes sync status and partial-history warnings.
- Wiki updates `actions`, `data-model`, `pages`, `components`, and `configuration` after implementation.

