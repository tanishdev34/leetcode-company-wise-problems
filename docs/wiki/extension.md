# Browser Extension

> **See also:** [[actions#post-apiextensionadd-solution]], [[data-model]]

## Overview

A Chrome/Edge Manifest V3 extension that allows adding LeetCode questions and solutions directly from LeetCode.com into the tracker.

**Directory:** `leetcode-extension/` (built with [WXT](https://wxt.dev) + React + Tailwind CSS)

## Structure

```
leetcode-extension/
├── wxt.config.ts           # WXT configuration (host_permissions, etc.)
├── package.json
├── entrypoints/
│   ├── background.ts       # Background service worker (auth, GraphQL, API)
│   ├── content.ts          # Content script (button injection, data extraction)
│   └── popup/
│       ├── index.html      # Popup entry HTML
│       ├── App.tsx         # React popup component (auth UI)
│       ├── main.tsx        # React mount point
│       ├── style.css       # Tailwind CSS v4 imports
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
