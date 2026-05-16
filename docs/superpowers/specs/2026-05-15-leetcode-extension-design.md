# LeetCode Browser Extension — Design Spec

> Adds a browser extension that lets users push LeetCode questions + solutions directly to the LeetCode Company Tracker app.

## Overview

A Chrome/Edge Manifest V3 extension that injects an "Add to Tracker" button on LeetCode problem and submission pages. Clicking it scrapes the question slug from the URL, fetches structured metadata from LeetCode's public GraphQL API, reads solution code from the submission page DOM (if applicable), and sends everything to the LeetCode Company Tracker app for storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Extension (Manifest V3)                                │
│                                                                 │
│  popup/              content/           background/             │
│  ┌──────────┐       ┌──────────────┐   ┌──────────────────┐    │
│  │ Login    │       │ Add to       │   │ API client       │    │
│  │ Status   │◄─────►│ Tracker btn  │◄──►│ Session mgmt    │    │
│  │ Settings │       │ DOM reader   │   │ Chrome storage   │    │
│  └──────────┘       └──────────────┘   └──────┬───────────┘    │
│                                                │                │
└────────────────────────────────────────────────┼────────────────┘
                                                 │ https + creds
                                                 ▼
┌────────────────────────────────────────────────────────────────┐
│  Next.js App                                                   │
│                                                                │
│  POST /api/extension/add-solution   → add question + code      │
│  POST /api/auth/*                    → Better Auth endpoints   │
│  /extension-auth-callback            → OAuth success landing   │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. User visits `leetcode.com/problems/<slug>/` or `leetcode.com/problems/<slug>/submissions/<id>/`
2. Content script detects LeetCode problem page, injects floating "Add to Tracker" button
3. User clicks button
4. Content script extracts:
   - **Title slug** from `window.location.pathname` (strip `/submissions/.../` if needed)
   - **Code** (if on submission page) from Monaco editor or `<pre>` code element
   - **Language** from submission page language indicator
5. Content script sends `{ action: "ADD_SOLUTION", titleSlug, code?, language? }` to background worker
6. Background worker:
   a. Queries `POST https://leetcode.com/graphql` with the title slug to get metadata
   b. Calls `POST <APP_URL>/api/extension/add-solution` with all data + `credentials: 'include'`
7. App upserts Question + "Extension" CompanyQuestion + saves code (as solved) in UserQuestion
8. Background worker responds → content script shows success/failure state on the button
9. **Error handling for LeetCode GraphQL in background worker:**
   - Network error or HTTP 429 (rate limit): retry once after 2s delay; if still failing, return `{ error: "LeetCode API unavailable" }`
   - GraphQL query error (invalid slug): return `{ error: "Could not find question data" }`
   - Unknown slug format: return `{ error: "Invalid question URL" }`
   - Content script renders error in red on the button for 3 seconds

## App Changes

### New Endpoint: `POST /api/extension/add-solution`

**Auth:** Session cookie required (same as existing server actions)

**Request body:**
```typescript
{
  titleSlug: string        // e.g. "two-sum"
  title: string            // "Two Sum"
  difficulty: "Easy" | "Medium" | "Hard"
  topics: string[]         // ["Array", "Hash Table"]
  acceptanceRate: number   // 57.47
  code?: string            // solution code (optional)
  language?: string        // "cpp" | "python" | "java" | etc. (optional)
}
```

**Logic:**
1. Ensure "Extension" company exists (slug: `extension`, upsert)
2. Build `leetcodeUrl` from title slug: `https://leetcode.com/problems/${titleSlug}/`
3. Upsert Question by `leetcodeUrl` (sets title, difficulty, topics, acceptanceRate)
4. Upsert CompanyQuestion linking question to "Extension" company (timePeriod: `ALL`, frequency: 0)
5. If code provided: upsert UserQuestion with `solved: true`, `solvedAt: now()`, code, language
6. If no code: no UserQuestion created (user just wants to track the question)

**Response:**
```typescript
{ success: true, data: { questionId: string } }
| { success: false, error: string }
```

### CORS (Not Needed)

Manifest V3 `host_permissions` grant the extension's background service worker and popup the ability to read cross-origin response bodies **without CORS**. This means:

- The background service worker can make `fetch()` calls to `<APP_URL>` with `credentials: 'include'` — cookies are automatically included and responses can be read.
- The popup can do the same.
- The content script (running on `leetcode.com`) **cannot** use this — but it doesn't need to. It only communicates with the background worker via `chrome.runtime.sendMessage`.

Therefore, **no CORS configuration changes are needed on the app side**. The app's existing behavior is sufficient.

### App Base URL Configuration

The extension needs to know the app's URL. This is configured in a `config.js` file in the extension:

```js
// extension/config.js — edit this before building
const APP_URL = "https://your-app.vercel.app"; // Change this to your deployed URL
```

For local development, set this to `http://localhost:3000`. The URL is used in both `manifest.json` (`host_permissions`) and all API calls.

### OAuth Login Flow (Google)

Better Auth's Google OAuth redirects to the app domain. Since extensions can't follow OAuth redirects in a popup easily, we use a **new tab + detection** approach:

1. Extension opens `https://<APP_URL>/login?redirect=/extension-auth-callback` in a new browser tab
2. User clicks "Sign in with Google" on the app's login page
3. Better Auth handles the OAuth flow → redirects to the app's callback URL → session cookie is set on the app domain
4. On success, Better Auth redirects to `/extension-auth-callback` (the `redirect` param)
5. That page displays "✅ Authentication successful! You can close this tab."
6. Back in the extension, the background worker detects the tab URL change via `chrome.tabs.onUpdated` listener (checking for the `/extension-auth-callback` path)
7. The worker then verifies the session by making a `GET /api/auth/me` request with `credentials: 'include'` (cookies are automatically included via `host_permissions`)
8. The popup is notified of the successful login

### Email/Password Login

The extension directly calls `POST /api/auth/sign-in/email` from the background worker:
```js
fetch(`<APP_URL>/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
})
```

Since the background worker has `host_permissions` for the app domain, cookies are automatically stored and sent with subsequent requests. No manual token management needed.

## Extension Structure

```
leetcode-extension/
├── manifest.json
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js
└── background/
    └── background.js
```

### `config.js`

A shared config file imported by background, popup, and content scripts:

```js
// config.js — edit before building/installing
const APP_URL = "https://your-app.vercel.app";
```

Replace with the deployed app URL (or `http://localhost:3000` for development). This is used in `manifest.json`'s `host_permissions` and all API call URLs.

### `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "LeetCode Company Tracker",
  "version": "1.0.0",
  "permissions": ["storage", "tabs"],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://your-app.vercel.app/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/problems/*"],
      "js": ["config.js", "content/content.js"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  }
}
```

### Content Script (`content/content.js`)

- Runs on `https://leetcode.com/problems/*`
- Detects page type: problem page vs submission page
- Injects a floating pill button at bottom-right with text `+ Add to Tracker`
- On click:
  1. Extract title slug from URL (`/problems/<slug>/...`)
  2. Read code and language from submission page if applicable (see selectors below)
  3. Send message to background worker
  4. Show inline loading/success/error state on the button
- Styled with shadow DOM to avoid LeetCode CSS conflicts

#### Code Extraction Selectors (Submission Page)

LeetCode's submission detail page renders code in a read-only Monaco editor. Known DOM structure:

```js
// Primary: Monaco editor view zone (most common on submission detail pages)
const codeEl = document.querySelector('.view-lines.monaco-mouse-cursor-text');
if (codeEl) {
  // Each line in a `.view-line` div — collect all lines
  const lines = codeEl.querySelectorAll('.view-line');
  code = Array.from(lines).map(line => line.textContent).join('\n');
}

// Fallback: Plain text in a <pre> or <code> element
const preEl = document.querySelector('pre');
if (preEl) code = preEl.textContent;

// Fallback: Raw textarea (old LC page versions)
const textarea = document.querySelector('textarea#solution-code');
if (textarea) code = textarea.value;
```

**Language detection:**
```js
// Look for the language indicator in the submission page
const langEl = document.querySelector('[data-cy="lang-select"]');
// or
const langEl = document.querySelector('.language-selector__selected');
// or infer from the code block's CSS class (e.g. language-cpp)
const inferredLang = document.querySelector('pre code')?.className?.match(/language-(\w+)/)?.[1];
```

If language can't be detected, default to `"cpp"` (the app's default).

#### Error Handling for Content Script

- If the title slug can't be extracted (unexpected URL format): show "Invalid page" error
- If code extraction fails on a submission page: proceed without code (question metadata only), but notify the user
- Network errors from background worker: show "Connection error — are you logged in?"
- Rate limiting from LeetCode GraphQL: show "LeetCode API rate limited, try again in a few seconds"

### Background Worker (`background/background.js`)

- Stores session state in `chrome.storage.local`
- Handles `ADD_SOLUTION` messages from content script
  - Queries LeetCode GraphQL for question metadata
  - Calls app's extension API endpoint with `credentials: 'include'`
  - Returns result to content script
- Handles auth operations from popup
  - Email/password login via `POST /api/auth/sign-in/email`
  - Session validation via `GET /api/auth/me` (or similar)
  - Logout via `POST /api/auth/sign-out`

#### Auth Mechanism

The background worker uses `fetch()` with `credentials: 'include'` for all requests to `<APP_URL>`. Because `host_permissions` are set in `manifest.json`:

- The browser automatically attaches the app domain's cookies (including Better Auth session cookies) to requests
- The browser allows reading the response body even without CORS headers
- No manual token extraction, storage, or injection is needed
- After login (email/password or Google OAuth), the session cookie is set on the app domain by Better Auth, and subsequent fetch calls from the worker automatically include it

**Session verification:** The popup can check if logged in by sending a message to the background worker, which calls `GET <APP_URL>/api/auth/me` with `credentials: 'include'` and returns the user info or null.

### Popup (`popup/`)

- **Unauthenticated state:**
  - Email + password inputs
  - "Sign In" button
  - "Sign in with Google" button (opens new tab for OAuth)
  - "Register" link
- **Authenticated state:**
  - "Logged in as {email}"
  - "Add to Tracker" quick summary (count of questions added today)
  - "Sign Out" button
- Minimal styling, matches app's look & feel

## LeetCode GraphQL Query

```graphql
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title
    titleSlug
    difficulty
    topicTags {
      name
    }
    acRate
  }
}
```

Example response:
```json
{
  "data": {
    "question": {
      "title": "Two Sum",
      "titleSlug": "two-sum",
      "difficulty": "Easy",
      "topicTags": [
        { "name": "Array" },
        { "name": "Hash Table" }
      ],
      "acRate": 57.47
    }
  }
}
```

## Company Strategy

All questions added via the extension are linked to an auto-created company "Extension" (slug: `extension`). This keeps them visually separate from company-sourced questions. The company is created via upsert so it only happens once. Frequency is set to 0 since it's not from a real data source.

The goal is to not pollute real company data while still making questions visible and trackable.

## Implementation Order

1. Add `POST /api/extension/add-solution` endpoint to the Next.js app
2. Create `/extension-auth-callback` page for OAuth success landing
3. Build the extension scaffolding (manifest, config, icons)
4. Implement background worker (API client, LeetCode GraphQL, auth)
5. Implement content script (button injection, data extraction, error states)
6. Implement popup (auth UI, login states)
7. Test end-to-end flow
8. Update AGENTS.md and docs/wiki/ with extension info

> CORS configuration is not needed (see CORS section). The `host_permissions` in manifest.json handle cross-origin access.

## Open Questions / Future Considerations

- **Pagination/sync flow**: Could later add a "Sync all recent submissions" feature that fetches recent AC submissions from LeetCode and batch-adds them
- **Offline support**: Currently requires internet. Could cache session data.
- **Multiple accounts**: One app account per extension instance
