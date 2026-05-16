# LeetCode Browser Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge Manifest V3 browser extension that lets users push LeetCode questions + solutions from LeetCode.com directly into the LeetCode Company Tracker app.

**Architecture:** The extension has 3 parts (content script, popup, background service worker) and communicates with a new `POST /api/extension/add-solution` endpoint on the Next.js app. Question metadata is fetched from LeetCode's public GraphQL API. Solution code is read from the submission page DOM. Auth uses Better Auth via cookies + `host_permissions`.

**Tech Stack:** Manifest V3, plain JS (no framework needed for extension), Next.js 16 API route, Prisma

**Spec:** `docs/superpowers/specs/2026-05-15-leetcode-extension-design.md`

**Package Manager:** bun (for app), nothing needed for extension (vanilla JS)

---

## Chunk 1: App-Side — Extension API Endpoint

### Task 1.1: Create `POST /api/extension/add-solution`

**Files:**
- Create: `app/api/extension/add-solution/route.ts`
- Also: `actions/admin.ts` already has `addQuestion` — we'll inline extension-specific logic here

- [ ] **Step 1: Create the API route file**

```typescript
// app/api/extension/add-solution/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import type { Difficulty, TimePeriod } from "@/generated/prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { titleSlug, title, difficulty, topics, acceptanceRate, code, language } = body as {
      titleSlug: string
      title: string
      difficulty: string
      topics: string[]
      acceptanceRate: number
      code?: string
      language?: string
    }

    if (!titleSlug || !title || !difficulty) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: titleSlug, title, difficulty" },
        { status: 422 }
      )
    }

    const diff = difficulty.toUpperCase()
    if (!["EASY", "MEDIUM", "HARD"].includes(diff)) {
      return NextResponse.json(
        { success: false, error: `Invalid difficulty: ${difficulty}` },
        { status: 422 }
      )
    }

    // 1. Ensure "Extension" company exists
    const company = await prisma.company.upsert({
      where: { slug: "extension" },
      update: { name: "Extension" },
      create: { name: "Extension", slug: "extension" },
    })

    // 2. Upsert the question
    const leetcodeUrl = `https://leetcode.com/problems/${titleSlug}/`
    const question = await prisma.question.upsert({
      where: { leetcodeUrl },
      update: {
        title,
        difficulty: diff as Difficulty,
        topics,
        acceptanceRate,
      },
      create: {
        title,
        leetcodeUrl,
        difficulty: diff as Difficulty,
        topics,
        acceptanceRate,
      },
    })

    // 3. Link question to "Extension" company
    await prisma.companyQuestion.upsert({
      where: {
        questionId_companyId_timePeriod: {
          questionId: question.id,
          companyId: company.id,
          timePeriod: "ALL" as TimePeriod,
        },
      },
      update: { frequency: 0 },
      create: {
        questionId: question.id,
        companyId: company.id,
        timePeriod: "ALL" as TimePeriod,
        frequency: 0,
      },
    })

    // 4. If code provided, save it as solved
    if (code) {
      await prisma.userQuestion.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: question.id,
          },
        },
        update: {
          code,
          language: language || "cpp",
          solved: true,
          solvedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          questionId: question.id,
          code,
          language: language || "cpp",
          solved: true,
          solvedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { questionId: question.id },
    })
  } catch (err) {
    console.error("Extension add-solution error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to add solution" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Build the app to check for type errors**

```bash
bun run build
```

Expected: No type errors. If types are missing (e.g., `TimePeriod`), import from the correct path.

- [ ] **Step 3: Verify the route is accessible**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/extension/add-solution
```

Expected: 401 (not authenticated — means the route exists and auth check works)

---

### Task 1.2: Create `/extension-auth-callback` page

**Files:**
- Create: `app/(main)/extension-auth-callback/page.tsx`

- [ ] **Step 1: Create the OAuth success landing page**

```typescript
// app/(main)/extension-auth-callback/page.tsx
export default function ExtensionAuthCallbackPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-2xl font-bold">Authentication Successful!</h1>
        <p className="text-muted-foreground">
          You have been logged in. You can close this tab and return to the extension.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
bun run build
```

Expected: No errors.

- [ ] **Step 3: Update login page to support `?redirect=` parameter**

Read the current login page to understand the structure:

Read: `app/(auth)/login/page.tsx` and `components/auth/login-form.tsx`

Then:
- In `login-form.tsx`, read `searchParams.redirect` from the URL and pass it to `signIn.email()` and `signIn.social()` as the `callbackURL`
- If no redirect param, default to `"/dashboard"` (existing behavior)

- [ ] **Step 4: Commit app-side changes**

```bash
git add app/api/extension/add-solution/route.ts app/(main)/extension-auth-callback/page.tsx
git commit -m "feat: add extension API endpoint and auth callback page"
```

---

## Chunk 2: Extension Scaffolding

### Task 2.1: Create extension directory structure and config

**Files:**
- Create: `leetcode-extension/manifest.json`
- Create: `leetcode-extension/config.js`
- Create: `leetcode-extension/icons/icon-16.png`
- Create: `leetcode-extension/icons/icon-48.png`
- Create: `leetcode-extension/icons/icon-128.png`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p leetcode-extension/{popup,content,background,icons}
```

- [ ] **Step 2: Create `config.js`**

```javascript
// leetcode-extension/config.js
// CHANGE THIS to your deployed app URL, or http://localhost:3000 for dev
const APP_URL = "http://localhost:3000";
```

- [ ] **Step 3: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "LeetCode Company Tracker",
  "version": "1.0.0",
  "description": "Add LeetCode questions and solutions to your Company Tracker",
  "permissions": ["storage", "tabs"],
  "host_permissions": [
    "https://leetcode.com/*",
    "http://localhost:3000/*"
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
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 4: Generate simple SVG icons as PNG placeholders**

Create a simple script or use a base64-encoded minimal icon for now:

```bash
# Generate simple colored square PNGs using python
python3 -c "
import struct, zlib
def create_png(size):
    # Create a simple blue square PNG
    width, height = size, size
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            # Blue gradient
            r, g, b = 59, 130, 246  # Tailwind blue-500
            raw += struct.pack('BBB', r, g, b)
    compressed = zlib.compress(raw)
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

for s in [16, 48, 128]:
    with open(f'leetcode-extension/icons/icon-{s}.png', 'wb') as f:
        f.write(create_png(s))
    print(f'Created icon-{s}.png')
"
```

- [ ] **Step 5: Commit scaffolding**

```bash
git add leetcode-extension/
git commit -m "feat: add browser extension scaffolding"
```

---

## Chunk 3: Extension Background Worker

### Task 3.1: Implement API client and auth logic

**Files:**
- Create: `leetcode-extension/background/background.js`

- [ ] **Step 1: Create the background service worker**

```javascript
// leetcode-extension/background/background.js
importScripts('../config.js');

// State
let isAuthenticated = false;
let userEmail = null;

// --- Auth ---

async function login(email, password) {
  try {
    const res = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.user || data.token || res.ok) {
      isAuthenticated = true;
      userEmail = email;
      await chrome.storage.local.set({ userEmail });
      return { success: true, email };
    }
    return { success: false, error: data.error || data.message || 'Login failed' };
  } catch (err) {
    return { success: false, error: 'Network error: cannot reach app' };
  }
}

async function logout() {
  try {
    await fetch(`${APP_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {}
  isAuthenticated = false;
  userEmail = null;
  await chrome.storage.local.remove('userEmail');
}

async function checkAuth() {
  try {
    const res = await fetch(`${APP_URL}/api/auth/me`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      isAuthenticated = true;
      userEmail = data.user?.email || data.email || 'Logged in';
      await chrome.storage.local.set({ userEmail });
      return { authenticated: true, email: userEmail };
    }
  } catch {}
  isAuthenticated = false;
  userEmail = null;
  await chrome.storage.local.remove('userEmail');
  return { authenticated: false };
}

// Restore session on startup
async function restoreSession() {
  const stored = await chrome.storage.local.get('userEmail');
  if (stored.userEmail) {
    userEmail = stored.userEmail;
  }
  // Verify session is still valid
  await checkAuth();
}
restoreSession();

// --- LeetCode GraphQL ---

async function fetchQuestionMetadata(titleSlug) {
  const query = {
    query: `query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        titleSlug
        difficulty
        topicTags { name }
        acRate
      }
    }`,
    variables: { titleSlug },
  };

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (res.status === 429) {
    // Rate limited, retry once after 2s
    await new Promise(r => setTimeout(r, 2000));
    const retryRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!retryRes.ok) throw new Error('LeetCode API rate limited');
    const retryData = await retryRes.json();
    if (retryData.errors) throw new Error(retryData.errors[0]?.message || 'GraphQL error');
    return retryData.data.question;
  }

  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  return data.data.question;
}

// --- Add Solution ---

async function addSolution({ titleSlug, code, language }) {
  // Fetch metadata from LeetCode
  const meta = await fetchQuestionMetadata(titleSlug);

  // Send to app
  const res = await fetch(`${APP_URL}/api/extension/add-solution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      titleSlug,
      title: meta.title,
      difficulty: meta.difficulty,
      topics: meta.topicTags.map(t => t.name),
      acceptanceRate: meta.acRate,
      code: code || null,
      language: language || null,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to add solution');
  return data.data;
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'LOGIN':
        sendResponse(await login(message.email, message.password));
        break;
      case 'LOGOUT':
        await logout();
        sendResponse({ success: true });
        break;
      case 'CHECK_AUTH':
        sendResponse(await checkAuth());
        break;
      case 'ADD_SOLUTION':
        try {
          const result = await addSolution({
            titleSlug: message.titleSlug,
            code: message.code,
            language: message.language,
          });
          sendResponse({ success: true, questionId: result.questionId });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();
  return true; // Keep channel open for async response
});
```

- [ ] **Step 2: Commit background worker**

```bash
git add leetcode-extension/background/background.js
git commit -m "feat: add extension background worker with auth and GraphQL"
```

---

## Chunk 4: Extension Content Script

### Task 4.1: Implement content script — button injection and data extraction

**Files:**
- Create: `leetcode-extension/content/content.js`

- [ ] **Step 1: Create the content script**

```javascript
// leetcode-extension/content/content.js

// --- State ---
let buttonEl = null;
let statusEl = null;

// --- Extract title slug from URL ---
function extractTitleSlug() {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

// --- Detect if we're on a submission page ---
function isSubmissionPage() {
  return window.location.pathname.includes('/submissions/');
}

// --- Extract code from submission page ---
function extractCode() {
  if (!isSubmissionPage()) return { code: null, language: null };

  // Try multiple selectors for LeetCode's Monaco editor
  const selectors = [
    '.view-lines.monaco-mouse-cursor-text',  // Monaco view zone
    'pre',                                     // Plain <pre> element
    '#solution-code',                          // Legacy textarea
    'textarea.code-area',                      // Alternative textarea
  ];

  let code = null;
  let language = null;

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      if (sel === '.view-lines.monaco-mouse-cursor-text') {
        // Monaco: each .view-line is one line
        const lines = el.querySelectorAll('.view-line');
        code = Array.from(lines)
          .map(line => line.textContent)
          .join('\n');
      } else {
        code = el.textContent;
      }
      break;
    }
  }

  // Also try to find code in the newer LeetCode UI
  if (!code) {
    // Check for code in a data-keybinding or role="code" element
    const codeBlock = document.querySelector('[role="code"]');
    if (codeBlock) {
      code = codeBlock.textContent;
    }
  }

  // Detect language
  const langMap = {
    cpp: ['cpp', 'c++'],
    java: ['java'],
    python: ['python', 'py'],
    python3: ['python3'],
    javascript: ['javascript', 'js'],
    typescript: ['typescript', 'ts'],
    go: ['go', 'golang'],
    rust: ['rust', 'rs'],
    swift: ['swift'],
    kotlin: ['kotlin', 'kt'],
  };

  const langEl = document.querySelector('[data-cy="lang-select"], .language-selector__selected, .language');
  if (langEl) {
    const langText = langEl.textContent.trim().toLowerCase();
    for (const [key, aliases] of Object.entries(langMap)) {
      if (aliases.includes(langText)) {
        language = key;
        break;
      }
    }
  }

  // Fallback: try to detect from code block CSS class
  if (!language) {
    const codePre = document.querySelector('pre code');
    if (codePre) {
      const match = codePre.className.match(/language-(\w+)/);
      if (match) language = match[1];
    }
  }

  return { code, language: language || 'cpp' };
}

// --- Inject the floating button ---
function injectButton() {
  if (buttonEl) return; // Already injected

  // Using shadow DOM to avoid LeetCode CSS conflicts
  const host = document.createElement('div');
  host.id = 'lc-tracker-btn-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .tracker-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      padding: 10px 20px;
      border: none;
      border-radius: 999px;
      background: #3b82f6;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tracker-btn:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }
    .tracker-btn:active {
      transform: translateY(0);
    }
    .tracker-btn.loading {
      background: #6b7280;
      pointer-events: none;
    }
    .tracker-btn.success {
      background: #22c55e;
    }
    .tracker-btn.error {
      background: #ef4444;
    }
    .tracker-btn.warning {
      background: #f59e0b;
    }
    .tracker-btn .status-text {
      font-size: 13px;
    }
  `;

  // Button
  const btn = document.createElement('button');
  btn.className = 'tracker-btn';
  btn.innerHTML = `<span>+</span> <span class="status-text">Add to Tracker</span>`;

  btn.addEventListener('click', async () => {
    const titleSlug = extractTitleSlug();
    if (!titleSlug) {
      showStatus('Invalid page', 'error');
      return;
    }

    btn.classList.add('loading');
    btn.innerHTML = `<span class="status-text">⏳ Fetching...</span>`;

    const { code, language } = extractCode();

    // If on submission page but code extraction failed, warn but proceed
    // (question metadata only — user can add code manually in the app)
    if (isSubmissionPage() && !code) {
      showStatus('No code found, saving question only', 'warning');
      // Don't return — proceed with metadata-only
      await new Promise(r => setTimeout(r, 1500));
    }

    // Check auth first
    const authRes = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
    if (!authRes.authenticated) {
      showStatus('Please log in first', 'error');
      return;
    }

    const res = await chrome.runtime.sendMessage({
      action: 'ADD_SOLUTION',
      titleSlug,
      code,
      language,
    });

    if (res.success) {
      showStatus('Added! ✓', 'success');
    } else {
      showStatus(res.error || 'Failed', 'error');
    }
  });

  shadow.appendChild(style);
  shadow.appendChild(btn);
  document.body.appendChild(host);

  buttonEl = btn;
}

let statusTimer = null;

function showStatus(text, type) {
  if (!buttonEl) return;
  if (statusTimer) clearTimeout(statusTimer);

  buttonEl.className = 'tracker-btn ' + type;
  buttonEl.innerHTML = `<span class="status-text">${text}</span>`;

  // Reset after 3s
  statusTimer = setTimeout(() => {
    if (buttonEl) {
      buttonEl.className = 'tracker-btn';
      buttonEl.innerHTML = `<span>+</span> <span class="status-text">Add to Tracker</span>`;
    }
    statusTimer = null;
  }, 3000);
}

// --- Initialize ---
// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectButton);
} else {
  injectButton();
}

// Also re-inject on SPA navigation (LeetCode uses client-side routing)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Remove old button
    const oldHost = document.getElementById('lc-tracker-btn-host');
    if (oldHost) oldHost.remove();
    buttonEl = null;
    injectButton();
  }
}).observe(document, { subtree: true, childList: true });
```

- [ ] **Step 2: Commit content script**

```bash
git add leetcode-extension/content/content.js
git commit -m "feat: add content script with button and data extraction"
```

---

## Chunk 5: Extension Popup

### Task 5.1: Implement popup HTML, CSS, and JS

**Files:**
- Create: `leetcode-extension/popup/popup.html`
- Create: `leetcode-extension/popup/popup.css`
- Create: `leetcode-extension/popup/popup.js`

- [ ] **Step 1: Create `popup.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <!-- Unauthenticated -->
    <div id="auth-view" class="view">
      <h2>LeetCode Tracker</h2>
      <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit" id="sign-in-btn">Sign In</button>
      </form>
      <div class="divider"><span>or</span></div>
      <button id="google-sign-in-btn">Sign in with Google</button>
      <p id="auth-error" class="error"></p>
    </div>

    <!-- Authenticated -->
    <div id="main-view" class="view" style="display:none">
      <h2>LeetCode Tracker</h2>
      <p id="user-email" class="user-email"></p>
      <button id="logout-btn" class="secondary">Sign Out</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `popup.css`**

```css
body {
  width: 320px;
  margin: 0;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #fff;
  color: #1f2937;
}

.view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #3b82f6;
  color: white;
  transition: background 0.15s;
}

button:hover {
  background: #2563eb;
}

button.secondary {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

button.secondary:hover {
  background: #f3f4f6;
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.error {
  color: #ef4444;
  font-size: 12px;
  margin: 0;
  min-height: 16px;
}

.user-email {
  color: #6b7280;
  font-size: 13px;
  margin: 0;
}
```

- [ ] **Step 3: Create `popup.js`**

```javascript
// leetcode-extension/popup/popup.js

const $ = (sel) => document.querySelector(sel);

const authView = $('#auth-view');
const mainView = $('#main-view');
const loginForm = $('#login-form');
const emailInput = $('#email');
const passwordInput = $('#password');
const signInBtn = $('#sign-in-btn');
const googleBtn = $('#google-sign-in-btn');
const registerLink = $('#register-link');
const authError = $('#auth-error');
const userEmailEl = $('#user-email');
const todayCountEl = $('#today-count');
const logoutBtn = $('#logout-btn');

// Check auth on popup open
async function init() {
  const res = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
  if (res.authenticated) {
    // Fetch today's count
    const countRes = await chrome.runtime.sendMessage({ action: 'GET_TODAY_COUNT' });
    showMainView(res.email, countRes.count || 0);
  } else {
    showAuthView();
  }
}

function showAuthView() {
  authView.style.display = 'flex';
  mainView.style.display = 'none';
}

function showMainView(email, todayCount = 0) {
  authView.style.display = 'none';
  mainView.style.display = 'flex';
  userEmailEl.textContent = `Logged in as ${email}`;
  todayCountEl.textContent = `${todayCount} question${todayCount !== 1 ? 's' : ''} added today`;
}

// Email/password login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signInBtn.disabled = true;
  signInBtn.textContent = 'Signing in...';
  authError.textContent = '';

  const res = await chrome.runtime.sendMessage({
    action: 'LOGIN',
    email: emailInput.value,
    password: passwordInput.value,
  });

  if (res.success) {
    const countRes = await chrome.runtime.sendMessage({ action: 'GET_TODAY_COUNT' });
    showMainView(res.email, countRes.count || 0);
  } else {
    authError.textContent = res.error || 'Login failed';
    signInBtn.disabled = false;
    signInBtn.textContent = 'Sign In';
  }
});

// Google OAuth
googleBtn.addEventListener('click', async () => {
  chrome.tabs.create({
    url: `http://localhost:3000/login?redirect=/extension-auth-callback`,
  });

  // Poll for auth status: check every 2s for up to 2 minutes
  let attempts = 0;
  const maxAttempts = 60;
  const poll = setInterval(async () => {
    attempts++;
    const res = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
    if (res.authenticated) {
      clearInterval(poll);
      const countRes = await chrome.runtime.sendMessage({ action: 'GET_TODAY_COUNT' });
      showMainView(res.email, countRes.count || 0);
    } else if (attempts >= maxAttempts) {
      clearInterval(poll);
      authError.textContent = 'Login timed out. Please try again.';
      showAuthView();
    }
  }, 2000);
});

// Register link — opens app's register page in new tab
registerLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3000/register' });
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'LOGOUT' });
  showAuthView();
});

init();
```

Also update `popup.html` to include the register link and today's count:

```html
<!-- In auth-view, after the Google button: -->
<p><a href="#" id="register-link">Create an account</a></p>

<!-- In main-view, after user-email: -->
<p id="today-count" class="today-count"></p>
```

Update `popup.css` with the new styles:

```css
.today-count {
  color: #3b82f6;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

#register-link {
  color: #3b82f6;
  font-size: 13px;
  text-decoration: none;
}

#register-link:hover {
  text-decoration: underline;
}
```

Also update the background worker to handle `GET_TODAY_COUNT` by tracking in `chrome.storage.local`:

```javascript
// In background.js, add to message handler:
case 'GET_TODAY_COUNT':
  const stored = await chrome.storage.local.get('todayCount');
  sendResponse({ count: stored.todayCount || 0 });
  break;
```

And increment the counter after each successful `ADD_SOLUTION`:

```javascript
// After successful addSolution call, in the ADD_SOLUTION handler:
const stored = await chrome.storage.local.get('todayCount');
const todayCount = (stored.todayCount || 0) + 1;
await chrome.storage.local.set({ todayCount });
```

- [ ] **Step 4: Commit popup**

```bash
git add leetcode-extension/popup/
git commit -m "feat: add extension popup with auth UI"
```

---

## Chunk 6: Polish and Wiki Update

### Task 6.1: Update `AGENTS.md` and wiki

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/wiki/index.md`
- Create or modify: `docs/wiki/extension.md`

- [ ] **Step 1: Read current AGENTS.md**

Read: `AGENTS.md` — add extension directory to the project structure and any relevant instructions.

- [ ] **Step 2: Create `docs/wiki/extension.md`**

```markdown
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
2. Open Chrome → Extensions → Load unpacked → select `leetcode-extension/`
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
```

- [ ] **Step 3: Update `AGENTS.md` project structure**

Add `leetcode-extension/` to the project structure section of AGENTS.md.

- [ ] **Step 4: Update `docs/wiki/index.md`**

Add a changelog entry and a link to the extension wiki page.

- [ ] **Step 5: Commit documentation changes**

```bash
git add AGENTS.md docs/wiki/
git commit -m "docs: add extension documentation to wiki and AGENTS.md"
```

---

## Task Summary

| Task | Files | Description |
|------|-------|-------------|
| 1.1 | `app/api/extension/add-solution/route.ts` | New API endpoint for extension |
| 1.2 | `app/(main)/extension-auth-callback/page.tsx` + modify login form | OAuth success page + redirect support |
| 2.1 | `leetcode-extension/{manifest.json,config.js,icons/*}` | Extension scaffolding |
| 3.1 | `leetcode-extension/background/background.js` | Background worker (auth, GraphQL, API) |
| 4.1 | `leetcode-extension/content/content.js` | Content script (button, extraction) |
| 5.1 | `leetcode-extension/popup/{popup.html,css,js}` | Popup auth UI |
| 6.1 | `AGENTS.md`, `docs/wiki/extension.md`, `docs/wiki/index.md` | Documentation |
