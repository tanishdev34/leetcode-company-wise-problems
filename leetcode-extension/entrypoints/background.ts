import type { Difficulty } from '../lib/types'

const APP_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://lc-grind.vercel.app'

// ─── State ──────────────────────────────────────────

let userEmail: string | null = null

// ─── Auth ───────────────────────────────────────────

async function login(email: string, password: string) {
  try {
    const res = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (!res.headers.get('content-type')?.includes('json')) {
      return { success: false as const, error: `Server returned ${res.status} — check APP_URL` }
    }
    const data = await res.json()
    if (data.user || res.ok) {
      userEmail = email
      await storage.setItem('local:userEmail', email)
      return { success: true as const, email }
    }
    return { success: false as const, error: data.error || data.message || 'Login failed' }
  } catch {
    return { success: false as const, error: 'Network error: cannot reach app' }
  }
}

async function logout() {
  try {
    await fetch(`${APP_URL}/api/auth/sign-out`, { method: 'POST', credentials: 'include' })
  } catch { /* ignore */ }
  userEmail = null
  await storage.removeItem('local:userEmail')
}

async function checkAuth() {
  try {
    const res = await fetch(`${APP_URL}/api/auth/get-session`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      userEmail = data.user?.email || 'Logged in'
      await storage.setItem('local:userEmail', userEmail)
      return { authenticated: true as const, email: userEmail }
    }
  } catch { /* ignore */ }
  userEmail = null
  await storage.removeItem('local:userEmail')
  return { authenticated: false as const }
}

// Restore session on startup
async function restoreSession() {
  const stored = await storage.getItem('local:userEmail')
  if (stored) userEmail = stored
  await checkAuth()
}
restoreSession()

// ─── LeetCode GraphQL ──────────────────────────────

interface QuestionMeta {
  title: string
  titleSlug: string
  difficulty: string
  topicTags: { name: string }[]
  acRate: number
}

async function fetchQuestionMetadata(titleSlug: string): Promise<QuestionMeta> {
  const query = {
    query: `query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) { title titleSlug difficulty topicTags { name } acRate }
    }`,
    variables: { titleSlug },
  }

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000))
    const retry = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    })
    if (!retry.ok) throw new Error('LeetCode API rate limited')
    const data = await retry.json()
    if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error')
    return data.data.question
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LeetCode API error (${res.status}${text ? ': ' + text.slice(0, 80) : ''})`)
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) throw new Error('LeetCode returned non-JSON response')
  const data = await res.json()
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error')
  return data.data.question
}

// ─── Add Solution ──────────────────────────────────

async function addSolution({ titleSlug, code, language }: {
  titleSlug: string
  code?: string | null
  language?: string | null
}) {
  const meta = await fetchQuestionMetadata(titleSlug)

  const res = await fetch(`${APP_URL}/api/extension/add-solution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      titleSlug,
      title: meta.title,
      difficulty: meta.difficulty as Difficulty,
      topics: meta.topicTags.map(t => t.name),
      acceptanceRate: meta.acRate,
      code: code || null,
      language: language || null,
    }),
  })

  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    const body = await res.text()
    throw new Error(`Server returned ${res.status} — did you deploy the latest app?`)
  }
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to add solution')
  return data.data as { questionId: string }
}

// ─── User Profile ───────────────────────────────────

async function getUserProfile() {
  try {
    const res = await fetch(`${APP_URL}/api/user/profile`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, ...data }
    }
  } catch { /* ignore */ }
  return { success: false as const }
}

// ─── LeetCode Stats ─────────────────────────────────

async function getLeetcodeStats(username: string) {
  try {
    const res = await fetch(`${APP_URL}/api/leetcode/stats?username=${username}`)
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, stats: data }
    }
  } catch { /* ignore */ }
  return { success: false as const }
}

// ─── Today's Count ─────────────────────────────────

async function getTodayCount() {
  const stored = await storage.getItem('local:todayCount')
  return { count: Number(stored) || 0 }
}

async function incrementTodayCount() {
  const stored = Number(await storage.getItem('local:todayCount')) || 0
  await storage.setItem('local:todayCount', String(stored + 1))
}

// ─── Message Router ────────────────────────────────

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    ;(async () => {
      try {
        switch (message.action) {
          case 'LOGIN':
            sendResponse(await login(message.email, message.password))
            break
          case 'LOGOUT':
            await logout()
            sendResponse({ success: true })
            break
          case 'CHECK_AUTH':
            sendResponse(await checkAuth())
            break
          case 'ADD_SOLUTION':
            const result = await addSolution({
              titleSlug: message.titleSlug,
              code: message.code,
              language: message.language,
            })
            await incrementTodayCount()
            sendResponse({ success: true, questionId: result.questionId })
            break
          case 'GET_TODAY_COUNT':
            sendResponse(await getTodayCount())
            break
          case 'GET_USER_PROFILE':
            sendResponse(await getUserProfile())
            break
          case 'GET_LEETCODE_STATS':
            sendResponse(await getLeetcodeStats(message.username))
            break
          default:
            sendResponse({ success: false, error: 'Unknown action' })
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err.message || 'Unknown error' })
      }
    })()
    return true // Keep channel open for async
  })
})
