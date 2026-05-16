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

  let code = null;
  let language = null;

  // 1. Try syntax-highlighted <code> block (react-syntax-highlighter on LC submission pages)
  //    Structure: <code class="language-cpp"><span><span class="linenumber">1</span><span class="token">class</span>...
  const highlightedCode = document.querySelector('code[class*="language-"]');
  if (highlightedCode) {
    // Clone to avoid mutating the page, then strip line number spans
    const clone = highlightedCode.cloneNode(true);
    clone.querySelectorAll('.linenumber').forEach(el => el.remove());
    code = clone.textContent.trim();
    // Detect language from the class (e.g. "language-cpp" → "cpp")
    const langMatch = highlightedCode.className.match(/language-(\w+)/);
    if (langMatch) language = langMatch[1];
  }

  // 2. Try Monaco editor view zone (old LC UI)
  if (!code) {
    const monacoLines = document.querySelectorAll('.view-lines.monaco-mouse-cursor-text .view-line');
    if (monacoLines.length > 0) {
      code = Array.from(monacoLines).map(line => line.textContent).join('\n');
    }
  }

  // 3. Fallback: plain <pre> element
  if (!code) {
    const pre = document.querySelector('pre');
    if (pre) {
      // Try to strip line numbers if present
      const clone = pre.cloneNode(true);
      clone.querySelectorAll('.linenumber').forEach(el => el.remove());
      code = clone.textContent.trim();
    }
  }

  // 4. Fallback: textarea
  if (!code) {
    const textarea = document.querySelector('#solution-code, textarea.code-area');
    if (textarea) code = textarea.value || textarea.textContent;
  }

  // Detect language (if not already detected from <code> class)
  if (!language) {
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


