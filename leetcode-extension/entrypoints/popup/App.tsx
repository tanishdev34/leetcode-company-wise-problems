import { useEffect, useState, useCallback } from 'react'

type ViewState = 'loading' | 'auth' | 'main'

function App() {
  const [view, setView] = useState<ViewState>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // ─── Check auth on mount ──────────────────────────

  useEffect(() => {
    ;(async () => {
      const res = await browser.runtime.sendMessage({ action: 'CHECK_AUTH' })
      if (res.authenticated) {
        setUserEmail(res.email)
        const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
        setTodayCount(c.count || 0)
        setView('main')
      } else {
        setView('auth')
      }
    })()
  }, [])

  // ─── Email login ──────────────────────────────────

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const res = await browser.runtime.sendMessage({
      action: 'LOGIN', email, password,
    })
    if (res.success) {
      setUserEmail(res.email)
      const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
      setTodayCount(c.count || 0)
      setView('main')
    } else {
      setError(res.error || 'Login failed')
    }
    setBusy(false)
  }, [email, password])

  // ─── Google OAuth ────────────────────────────────

  const handleGoogle = useCallback(async () => {
    const base = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://lc-grind.vercel.app'
    await browser.tabs.create({ url: `${base}/login?redirect=/extension-auth-callback` })

    setBusy(true)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const res = await browser.runtime.sendMessage({ action: 'CHECK_AUTH' })
      if (res.authenticated) {
        clearInterval(poll)
        setUserEmail(res.email)
        const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
        setTodayCount(c.count || 0)
        setView('main')
        setBusy(false)
      } else if (attempts >= 60) {
        clearInterval(poll)
        setError('Login timed out')
        setBusy(false)
      }
    }, 2000)
  }, [])

  // ─── Logout ───────────────────────────────────────

  const handleLogout = useCallback(async () => {
    await browser.runtime.sendMessage({ action: 'LOGOUT' })
    setView('auth')
    setUserEmail('')
    setTodayCount(0)
  }, [])

  // ─── Register ─────────────────────────────────────

  const handleRegister = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const base = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://lc-grind.vercel.app'
    browser.tabs.create({ url: `${base}/register` })
  }, [])

  // ─── Render ───────────────────────────────────────

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 text-white shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"/><path d="M10 22h4"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-gray-900">LC Tracker</span>
    </div>
  )

  if (view === 'loading') {
    return (
      <div className="p-5 flex flex-col gap-4">
        {brand}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (view === 'auth') {
    return (
      <div className="p-5 flex flex-col gap-4 animate-[fadeSlideIn_0.2s_ease-out]">
        {brand}
        <form onSubmit={handleLogin} className="flex flex-col gap-2.5">
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all disabled:opacity-50"
          />
          <input
            type="password" placeholder="Password" required autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={busy}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-gray-300 text-xs font-medium">
          <div className="flex-1 h-px bg-gray-100" />
          <span>or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <button type="button" onClick={handleGoogle} disabled={busy}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all disabled:opacity-50">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center">
          <a href="#" onClick={handleRegister}
            className="text-xs text-gray-400 hover:text-gray-900 no-underline transition-colors">
            Create an account
          </a>
        </p>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  // Main (authenticated) view
  return (
    <div className="p-5 flex flex-col gap-4 animate-[fadeSlideIn_0.2s_ease-out]">
      {brand}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-900 break-all">{userEmail}</p>
        <p className="text-xs text-gray-400 font-medium">
          {todayCount} question{todayCount !== 1 ? 's' : ''} added today
        </p>
      </div>
      <button type="button" onClick={handleLogout}
        className="w-full py-2 text-xs font-medium rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all">
        Sign Out
      </button>
    </div>
  )
}

export default App
