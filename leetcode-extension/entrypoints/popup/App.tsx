import { useEffect, useState, useCallback } from 'react'

type ViewState = 'loading' | 'auth' | 'main'

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 800
    const steps = 24
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <>{display}{suffix}</>
}

function DifficultyBar({ label, value, max, color, glow, delay }: { label: string; value: number; max: number; color: string; glow: string; delay: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span style={{ color }}>{label}</span>
        <span className="text-[var(--color-muted)] tabular-nums"><AnimatedCounter value={value} /></span>
      </div>
      <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="bar-grow h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${glow} 100%)`,
            boxShadow: `0 0 8px ${glow}66`,
            animationDelay: delay,
          }}
        />
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<ViewState>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [leetcodeUsername, setLeetcodeUsername] = useState<string | null>(null)
  const [lcStats, setLcStats] = useState<{ easy: number; medium: number; hard: number; total: number; rating: number | null } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [recommended, setRecommended] = useState<{ title: string; leetcodeUrl: string; difficulty: string; topics: string[] } | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await browser.runtime.sendMessage({ action: 'CHECK_AUTH' })
      if (res.authenticated) {
        setUserEmail(res.email)
        const c = await browser.runtime.sendMessage({ action: 'GET_TODAY_COUNT' })
        setTodayCount(c.count || 0)
        setView('main')

        const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
        if (profile.success && profile.leetcodeUsername) {
          setLeetcodeUsername(profile.leetcodeUsername)
        }
      } else {
        setView('auth')
      }
    })()
  }, [])

  useEffect(() => {
    if (!leetcodeUsername) return
    ;(async () => {
      setStatsLoading(true)
      const res = await browser.runtime.sendMessage({ action: 'GET_LEETCODE_STATS', username: leetcodeUsername })
      if (res.success && res.stats) {
        setLcStats({
          easy: res.stats.solved?.easySolved ?? 0,
          medium: res.stats.solved?.mediumSolved ?? 0,
          hard: res.stats.solved?.hardSolved ?? 0,
          total: res.stats.solved?.solvedProblem ?? 0,
          rating: res.stats.contest?.contestRating ?? null,
        })
      }
      setStatsLoading(false)

      setRecLoading(true)
      const rec = await browser.runtime.sendMessage({ action: 'GET_RECOMMENDED_QUESTION' })
      if (rec.success && rec.question) {
        setRecommended(rec.question)
      }
      setRecLoading(false)
    })()
  }, [leetcodeUsername])

  useEffect(() => {
    if (view !== 'main') return
    ;(async () => {
      const res = await browser.runtime.sendMessage({ action: 'FETCH_QUOTE' })
      if (res.success) {
        setQuote({ text: res.text, author: res.author })
      }
    })()
  }, [view])

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

      const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
      if (profile.success && profile.leetcodeUsername) {
        setLeetcodeUsername(profile.leetcodeUsername)
      }
    } else {
      setError(res.error || 'Login failed')
    }
    setBusy(false)
  }, [email, password])

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

        const profile = await browser.runtime.sendMessage({ action: 'GET_USER_PROFILE' })
        if (profile.success && profile.leetcodeUsername) {
          setLeetcodeUsername(profile.leetcodeUsername)
        }
        setBusy(false)
      } else if (attempts >= 60) {
        clearInterval(poll)
        setError('Login timed out')
        setBusy(false)
      }
    }, 2000)
  }, [])

  const handleLogout = useCallback(async () => {
    await browser.runtime.sendMessage({ action: 'LOGOUT' })
    setView('auth')
    setUserEmail('')
    setTodayCount(0)
    setLeetcodeUsername(null)
    setLcStats(null)
    setRecommended(null)
    setQuote(null)
  }, [])

  const handleRegister = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const base = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://lc-grind.vercel.app'
    browser.tabs.create({ url: `${base}/register` })
  }, [])

  // Floating background orbs (decorative)
  const orbs = (
    <>
      <div className="orb" style={{ top: '-40px', left: '-40px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(129,140,248,0.35), transparent 70%)' }} />
      <div className="orb" style={{ bottom: '-60px', right: '-50px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(192,132,252,0.28), transparent 70%)', animationDelay: '1.2s' }} />
    </>
  )

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shrink-0 shadow-[0_4px_20px_-4px_rgba(129,140,248,0.6)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"/><path d="M10 22h4"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-fuchsia-400 opacity-50 blur-md -z-10" />
      </div>
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold tracking-tight brand-gradient-text leading-none">LC Tracker</span>
        <span className="text-[10px] text-[var(--color-subtle)] tracking-wider uppercase mt-0.5">Grind smarter</span>
      </div>
    </div>
  )

  if (view === 'loading') {
    return (
      <div className="p-5 flex flex-col gap-4 relative">
        {orbs}
        {brand}
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 border-r-fuchsia-400 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (view === 'auth') {
    return (
      <div className="p-5 flex flex-col gap-4 relative animate-[fadeSlideIn_0.3s_ease-out]">
        {orbs}
        {brand}

        <div className="card-enter card-delay-1 mt-1">
          <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
            Welcome back. <span className="text-[var(--color-text)]">Sign in</span> to track your daily grind.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-2.5 card-enter card-delay-2">
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.03] border border-white/[0.08] text-[var(--color-text)] placeholder-[var(--color-subtle)] outline-none focus:border-indigo-400/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-indigo-400/15 transition-all disabled:opacity-50"
          />
          <input
            type="password" placeholder="Password" required autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
            disabled={busy}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.03] border border-white/[0.08] text-[var(--color-text)] placeholder-[var(--color-subtle)] outline-none focus:border-indigo-400/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-indigo-400/15 transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={busy}
            className="relative w-full py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:from-indigo-400 hover:to-fuchsia-400 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_6px_24px_-8px_rgba(129,140,248,0.6)]">
            {busy ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[var(--color-subtle)] text-xs font-medium card-enter card-delay-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span>or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <button type="button" onClick={handleGoogle} disabled={busy}
          className="card-enter card-delay-3 flex items-center justify-center gap-2.5 w-full py-2.5 text-sm font-medium rounded-xl border border-white/[0.08] bg-white/[0.03] text-[var(--color-text)] hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center card-enter card-delay-4">
          <a href="#" onClick={handleRegister}
            className="text-xs text-[var(--color-muted)] hover:text-indigo-300 no-underline transition-colors">
            New here? <span className="underline-offset-2 underline decoration-dotted">Create an account</span>
          </a>
        </p>

        {error && <p className="text-xs text-red-400 text-center card-enter">{error}</p>}
      </div>
    )
  }

  const totalLcSolved = lcStats?.total ?? 0
  const maxDifficulty = lcStats ? Math.max(lcStats.easy, lcStats.medium, lcStats.hard, 1) : 1

  return (
    <div className="p-5 flex flex-col gap-3.5 relative">
      {orbs}

      <div className="card-enter">{brand}</div>

      {/* Hero / Today Card */}
      <div className="card-enter card-delay-1 relative overflow-hidden rounded-2xl p-4 border border-white/[0.08] glass group hover:border-indigo-400/30 transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.15em]">Today</span>
            <span className="text-[10px] text-[var(--color-subtle)] truncate max-w-[160px]">{userEmail}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold brand-gradient-text tabular-nums leading-none">
              <AnimatedCounter value={todayCount} />
            </span>
            <span className="text-xs text-[var(--color-muted)] font-medium">
              question{todayCount !== 1 ? 's' : ''} added
            </span>
          </div>
        </div>
      </div>

      {/* LeetCode Stats Card */}
      {leetcodeUsername && (
        <div className="card-enter card-delay-2 relative rounded-2xl p-4 border border-white/[0.08] glass hover:border-white/[0.14] transition-all duration-300 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.15em]">LeetCode</span>
            <span className="text-[10px] text-[var(--color-subtle)]">@{leetcodeUsername}</span>
          </div>

          {statsLoading ? (
            <div className="flex flex-col gap-2">
              <div className="h-7 w-24 rounded shimmer-bg" />
              <div className="h-1.5 w-full rounded shimmer-bg" />
              <div className="h-1.5 w-full rounded shimmer-bg" />
              <div className="h-1.5 w-full rounded shimmer-bg" />
            </div>
          ) : lcStats ? (
            <>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[var(--color-text)] tabular-nums leading-none">
                    <AnimatedCounter value={totalLcSolved} />
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-medium uppercase tracking-wider">solved</span>
                </div>
                {lcStats.rating !== null && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-[var(--color-subtle)] uppercase tracking-wider">Rating</span>
                    <span className="text-sm font-bold text-amber-300 tabular-nums">{Math.round(lcStats.rating)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <DifficultyBar label="Easy"   value={lcStats.easy}   max={maxDifficulty} color="#34d399" glow="#10b981" delay="200ms" />
                <DifficultyBar label="Medium" value={lcStats.medium} max={maxDifficulty} color="#fbbf24" glow="#f59e0b" delay="320ms" />
                <DifficultyBar label="Hard"   value={lcStats.hard}   max={maxDifficulty} color="#f87171" glow="#ef4444" delay="440ms" />
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--color-subtle)] py-1">Unable to load stats</p>
          )}
        </div>
      )}

      {/* Recommended Question */}
      {recLoading && !recommended ? (
        <div className="card-enter card-delay-3 rounded-2xl p-4 border border-white/[0.08] glass flex flex-col gap-2">
          <div className="h-3 w-28 rounded shimmer-bg" />
          <div className="h-4 w-3/4 rounded shimmer-bg" />
        </div>
      ) : recommended ? (
        <a
          href={recommended.leetcodeUrl}
          target="_blank"
          rel="noreferrer"
          className="card-enter card-delay-3 relative overflow-hidden rounded-2xl p-4 border border-white/[0.08] glass hover:border-indigo-400/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-2 no-underline group"
        >
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-fuchsia-500/15 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.15em]">Up Next</span>
            <span className="text-[10px] text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
          </div>
          <p className="relative text-sm font-semibold text-[var(--color-text)] group-hover:text-indigo-200 transition-colors leading-snug">
            {recommended.title}
          </p>
          <div className="relative flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              recommended.difficulty === 'EASY' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
              recommended.difficulty === 'MEDIUM' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :
              'bg-red-500/15 text-red-300 border border-red-500/20'
            }`}>
              {recommended.difficulty}
            </span>
            {recommended.topics.slice(0, 3).map(t => (
              <span key={t} className="text-[9px] text-[var(--color-muted)] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        </a>
      ) : null}

      {/* Quote */}
      {quote ? (
        <div className="card-enter card-delay-4 relative overflow-hidden rounded-2xl p-4 border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.08]">
          <svg className="absolute top-2 left-2 w-5 h-5 text-indigo-400/30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
          </svg>
          <p className="text-[13px] text-[var(--color-text)]/90 leading-relaxed italic pl-6">
            {quote.text}
          </p>
          <p className="text-[10px] text-indigo-300/80 font-medium mt-2 uppercase tracking-wider pl-6">— {quote.author}</p>
        </div>
      ) : (
        <div className="card-enter card-delay-4 rounded-2xl p-4 border border-white/[0.06] bg-gradient-to-br from-indigo-500/[0.05] to-fuchsia-500/[0.05] flex items-center justify-center py-5">
          <div className="w-4 h-4 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Sign Out */}
      <button type="button" onClick={handleLogout}
        className="card-enter card-delay-5 w-full py-2 mt-0.5 text-[11px] font-medium rounded-xl text-[var(--color-subtle)] hover:text-[var(--color-text)] hover:bg-white/[0.04] active:scale-[0.98] transition-all">
        Sign Out
      </button>
    </div>
  )
}

export default App
