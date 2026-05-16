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
    const res = await fetch(`${APP_URL}/api/auth/get-session`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      // Better Auth returns { user, session } from get-session
      isAuthenticated = true;
      userEmail = data.user?.email || 'Logged in';
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

// --- Today's Count (tracked locally) ---

async function getTodayCount() {
  const stored = await chrome.storage.local.get('todayCount');
  return { count: stored.todayCount || 0 };
}

async function incrementTodayCount() {
  const stored = await chrome.storage.local.get('todayCount');
  const todayCount = (stored.todayCount || 0) + 1;
  await chrome.storage.local.set({ todayCount });
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
          await incrementTodayCount();
          sendResponse({ success: true, questionId: result.questionId });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        break;
      case 'GET_TODAY_COUNT':
        sendResponse(await getTodayCount());
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();
  return true; // Keep channel open for async response
});
