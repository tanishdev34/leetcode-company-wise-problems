# Browser Extension

> **See also:** [[actions#post-apiextensionadd-solution]], [[data-model]]

## Overview

A Chrome/Edge Manifest V3 extension that allows adding LeetCode questions and solutions directly from LeetCode.com into the tracker.

**Directory:** `leetcode-extension/`

## Structure

```
leetcode-extension/
├── manifest.json          # Extension manifest
├── config.js              # App URL configuration
├── icons/                 # Extension icons (16/48/128)
├── popup/
│   ├── popup.html         # Auth popup HTML
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic (auth UI)
├── content/
│   └── content.js         # Injected button + data extraction
└── background/
    └── background.js      # API client, auth, GraphQL queries
```

## Setup

1. Edit `config.js` and set `APP_URL` to your deployed app URL (or `http://localhost:3000` for development)
2. Open Chrome → Extensions → Enable Developer mode → Load unpacked → select `leetcode-extension/`
3. Log in via the extension popup (email/password or Google OAuth)

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
