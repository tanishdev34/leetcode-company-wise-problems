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

// ─── Quote (F1 drivers) ─────────────────────────────

const F1_QUOTES: { text: string; author: string }[] = [
  { text: "If you no longer go for a gap that exists, you are no longer a racing driver.", author: "Ayrton Senna" },
  { text: "I have no idols. I admire work, dedication and competence.", author: "Ayrton Senna" },
  { text: "You commit yourself to such a level where there is no compromise. You give everything you have, absolutely everything.", author: "Ayrton Senna" },
  { text: "Being second is to be the first of the ones who lose.", author: "Ayrton Senna" },
  { text: "Winning is the most important. Everything is consequence of that.", author: "Ayrton Senna" },
  { text: "I am not designed to come second or third. I am designed to win.", author: "Ayrton Senna" },
  { text: "Still I am racing.", author: "Michael Schumacher" },
  { text: "I always give 100% — at training, in qualifying and in a race.", author: "Michael Schumacher" },
  { text: "When you do something nobody else does, you build the future.", author: "Michael Schumacher" },
  { text: "You win some, you lose some. You wreck some.", author: "Dale Earnhardt" },
  { text: "Straight roads are for fast cars, turns are for fast drivers.", author: "Colin McRae" },
  { text: "Anything else you do in life, after racing, seems boring.", author: "Mario Andretti" },
  { text: "If everything seems under control, you're not going fast enough.", author: "Mario Andretti" },
  { text: "Desire is the key to motivation, but it's determination and commitment to an unrelenting pursuit of your goal that will enable you to attain the success you seek.", author: "Mario Andretti" },
  { text: "To achieve anything in this game, you must be prepared to dabble in the boundary of disaster.", author: "Stirling Moss" },
  { text: "I don't drive sideways for the spectators. I drive sideways because it's fast.", author: "Walter Röhrl" },
  { text: "It's only when you go for something with all your heart and soul that you find out if it's possible.", author: "Lewis Hamilton" },
  { text: "Anything is possible. You just have to believe in yourself and never give up.", author: "Lewis Hamilton" },
  { text: "Pressure is a privilege.", author: "Lewis Hamilton" },
  { text: "I always say, never settle for less than your dreams.", author: "Lewis Hamilton" },
  { text: "I'm a perfectionist. I want to win every race.", author: "Lewis Hamilton" },
  { text: "I never look back, I always look forward.", author: "Niki Lauda" },
  { text: "The best driver is the one who is fastest, and the safest.", author: "Niki Lauda" },
  { text: "Two laps in the lead is the same as one lap in the lead.", author: "Niki Lauda" },
  { text: "Don't compare yourself to others. Be your own benchmark.", author: "Sebastian Vettel" },
  { text: "I love what I do. Sometimes you have ups and downs but I never lose passion.", author: "Sebastian Vettel" },
  { text: "Smooth is fast.", author: "Jackie Stewart" },
  { text: "In racing, there are always things you can learn, every single day.", author: "Fernando Alonso" },
  { text: "I want to win, I want to fight for the championship. Nothing else matters.", author: "Fernando Alonso" },
  { text: "Mentality is everything. The body follows the mind.", author: "Fernando Alonso" },
  { text: "There is no comfort in the growth zone, and no growth in the comfort zone.", author: "Daniel Ricciardo" },
  { text: "If you're not first, you're last.", author: "Ricky Bobby" },
  { text: "It's important never to give up. Stay focused on your dream.", author: "Max Verstappen" },
  { text: "You only get one shot, so you have to make it count.", author: "Max Verstappen" },
  { text: "I always push to the limit. That's what racing is about.", author: "Max Verstappen" },
  { text: "When you're racing, it's life. Anything before or after is just waiting.", author: "Steve McQueen" },
  { text: "The cars we drive say a lot about us.", author: "Alexandra Paul" },
  { text: "Without a sense of urgency, desire loses its value.", author: "Jim Rohn (paraphrased in paddock)" },
]

async function fetchQuote() {
  const q = F1_QUOTES[Math.floor(Math.random() * F1_QUOTES.length)]
  return { success: true as const, text: q.text, author: q.author }
}

// ─── Recommended Question ───────────────────────────

async function getRecommendedQuestion() {
  try {
    const res = await fetch(`${APP_URL}/api/questions/recommend`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, question: data.question }
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

// ─── Overlay Data ─────────────────────────────────

interface OverlayData {
  title: string
  difficulty: string
  solved: boolean
  solvedAt: string | null
  companies: { name: string; frequency: number }[]
  reviewDue: boolean
  reviewCount: number
  notes: string | null
  questionId: string
}

async function getOverlayData(slug: string) {
  try {
    const res = await fetch(`${APP_URL}/api/question/overlay?slug=${slug}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return data as { success: boolean; data: OverlayData }
    }
    const body = await res.text().catch(() => '')
    return { success: false as const, error: `Server returned ${res.status}${body ? ': ' + body.slice(0, 100) : ''}` }
  } catch {
    return { success: false as const, error: 'Network error: cannot reach app' }
  }
}

// ─── Toggle Solved ────────────────────────────────

async function toggleSolved(questionId: string, slug: string) {
  try {
    const res = await fetch(`${APP_URL}/api/questions/toggle-solved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ questionId, slug }),
    })
    if (res.ok) {
      const data = await res.json()
      return { success: true as const, ...data }
    }
    const body = await res.text().catch(() => '')
    return { success: false as const, error: `Server returned ${res.status}${body ? ': ' + body.slice(0, 100) : ''}` }
  } catch {
    return { success: false as const, error: 'Network error: cannot reach app' }
  }
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
          case 'GET_RECOMMENDED_QUESTION':
            sendResponse(await getRecommendedQuestion())
            break
          case 'FETCH_QUOTE':
            sendResponse(await fetchQuote())
            break
          case 'GET_OVERLAY_DATA':
            sendResponse(await getOverlayData(message.slug))
            break
          case 'TOGGLE_SOLVED':
            sendResponse(await toggleSolved(message.questionId, message.slug))
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
