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
