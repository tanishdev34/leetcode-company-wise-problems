# Browser Extension

> **See also:** [[actions#post-apiextensionadd-solution]], [[data-model]], [[actions#get-apiuserprofile]]

## Overview

A Chrome/Edge Manifest V3 extension that allows adding LeetCode questions and solutions directly from LeetCode.com into the tracker. The popup also shows LeetCode stats, motivation quotes, and animated counters for a richer user experience.

**Directory:** `leetcode-extension/` (built with [WXT](https://wxt.dev) + React + Tailwind CSS)

## Structure

```
leetcode-extension/
├── wxt.config.ts           # WXT configuration (host_permissions, etc.)
├── package.json
├── entrypoints/
│   ├── background.ts       # Background service worker (auth, GraphQL, API, user profile, LC stats)
│   ├── content.ts          # Content script (button injection, data extraction)
│   └── popup/
│       ├── index.html      # Popup entry HTML
│       ├── App.tsx         # React popup component (auth UI + LC stats dashboard + quotes)
│       ├── main.tsx        # React mount point
│       ├── style.css       # Tailwind CSS v4 imports + fadeSlideIn animation
│       └── App.css
├── lib/
│   └── types.ts            # Shared TypeScript types
├── public/
│   └── icon/               # Extension icons (16/32/48/96/128)
└── .output/                # Built output (gitignored)
```

## Setup

```bash
cd leetcode-extension
npm install
npm run dev        # watch mode with HMR
npm run build      # production build → .output/chrome-mv3/
```

Then load `leetcode-extension/.output/chrome-mv3/` in Chrome as an unpacked extension.

## Usage

- Visit any LeetCode problem page (`/problems/<slug>/`) or submission detail page (`/problems/<slug>/submissions/<id>/`)
- Click the floating blue "+ Add to Tracker" button at the bottom-right
- The question metadata is fetched from LeetCode's GraphQL API
- On submission pages, the solution code is also extracted and saved
- Questions are linked to an "Extension" company in the app

## Popup

The popup (`App.tsx`) provides:

- **Auth UI** — Email/password login and Google OAuth flow (opens a tab, polls for session).
- **Main view (authenticated)** — Shows the user's email, today's question add count (with animated `AnimatedCounter`), LeetCode stats card (easy/medium/hard solved counts with animated counters, fetched via `GET_USER_PROFILE` + `GET_LEETCODE_STATS` background handlers), a random motivation quote card, and a Sign Out button.
- **Animations** — `fadeSlideIn` keyframe animation on view transitions. `AnimatedCounter` component animates number increments over 600ms.
- **Quote card** — Displays a random programming quote (from a curated list of 15 quotes) with a gradient background.

## Background Worker

The background script handles authentication, GraphQL queries, API calls, user profile fetching, and LeetCode stats. It exposes the following message actions to the popup and content script:

| Action | Sent By | Description |
|--------|---------|-------------|
| `LOGIN` | Popup | Email/password login |
| `LOGOUT` | Popup | Sign out |
| `CHECK_AUTH` | Popup, Content | Check session status |
| `ADD_SOLUTION` | Content | Add question/solution — calls `POST /api/extension/add-solution` |
| `GET_TODAY_COUNT` | Popup | Returns today's question count from local storage |
| `GET_USER_PROFILE` | Popup | Fetches user profile via [[actions#get-apiuserprofile]] — returns `{ success, email, leetcodeUsername, codeforcesUsername }` |
| `GET_LEETCODE_STATS` | Popup | Fetches LeetCode stats for the linked username via [[actions#get-leetcode-stats]] — returns `{ success, stats: { easy, medium, hard } }` |

## Data Flow

1. Content script extracts title slug from URL, reads code from DOM (submission pages)
2. Background worker queries LeetCode GraphQL API for metadata
3. Background worker calls `POST /api/extension/add-solution` on the app
4. App upserts Question + "Extension" CompanyQuestion + saves code as solved

## App API

### `POST /api/extension/add-solution`

Creates or updates a question from extension data. Requires auth session.

**Body:** `{ titleSlug, title, difficulty, topics, acceptanceRate, code?, language? }`
**Returns:** `{ success: true, data: { questionId } } | { success: false, error }`
