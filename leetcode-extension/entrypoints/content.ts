export default defineContentScript({
  matches: ['https://leetcode.com/problems/*', 'https://leetcode.com/submissions/detail/*'],
  main() {
    let wrapEl: HTMLElement | null = null
    let labelEl: HTMLElement | null = null
    let btnEl: HTMLElement | null = null
    let statusTimeout: ReturnType<typeof setTimeout> | null = null

    // ─── Slug ──────────────────────────────────────

    function extractTitleSlug() {
      // 1. From URL path (e.g. /problems/two-sum/...)
      let m = location.pathname.match(/\/problems\/([^/]+)/)
      if (m) return m[1]

      // 2. From /submissions/detail/<id>/ page — find a link to the problem
      const link = document.querySelector<HTMLAnchorElement>('a[href*="/problems/"]')
      if (link) {
        m = link.pathname.match(/\/problems\/([^/]+)/)
        if (m) return m[1]
      }

      // 3. Try finding the slug in the page title (e.g. "Two Sum - LeetCode")
      const title = document.title
      m = title.match(/^(.+?)\s*-\s*LeetCode/)
      if (m) {
        // Convert title text to slug: "Two Sum" → "two-sum"
        return m[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }

      return null
    }

    function isSubmissionPage() {
      return location.pathname.includes('/submissions/')
    }

    // ─── Code Extraction ───────────────────────────

    function extractCode(): { code: string | null; language: string | null } {
      if (!isSubmissionPage()) return { code: null, language: null }

      let code: string | null = null
      let lang: string | null = null

      // 1. Syntax-highlighted <code> block
      const highlightedCode = document.querySelector<HTMLElement>('code[class*="language-"]')
      if (highlightedCode) {
        const clone = highlightedCode.cloneNode(true) as HTMLElement
        clone.querySelectorAll('.linenumber').forEach(el => el.remove())
        code = clone.textContent?.trim() || null
        const m = highlightedCode.className.match(/language-(\w+)/)
        if (m) lang = m[1]
        return { code, language: lang }
      }

      // 2. Monaco editor
      const monacoLines = document.querySelectorAll('.view-lines.monaco-mouse-cursor-text .view-line')
      if (monacoLines.length > 0) {
        code = Array.from(monacoLines).map(l => l.textContent).join('\n')
      }

      // 3. Plain <pre>
      if (!code) {
        const pre = document.querySelector('pre')
        if (pre) {
          const clone = pre.cloneNode(true) as HTMLElement
          clone.querySelectorAll('.linenumber').forEach(el => el.remove())
          code = clone.textContent?.trim() || null
        }
      }

      // 4. Textarea fallback
      if (!code) {
        const ta = document.querySelector<HTMLTextAreaElement>('#solution-code, textarea.code-area')
        if (ta) code = ta.value || ta.textContent
      }

      // Language detection
      if (!lang) {
        const langEl = document.querySelector('[data-cy="lang-select"], .language-selector__selected, .language')
        if (langEl) {
          const text = langEl.textContent?.trim().toLowerCase() || ''
          const map: Record<string, string[]> = {
            cpp: ['cpp', 'c++'], java: ['java'], python: ['python', 'py'],
            python3: ['python3'], javascript: ['javascript', 'js'],
            typescript: ['typescript', 'ts'], go: ['go', 'golang'],
            rust: ['rust', 'rs'], swift: ['swift'], kotlin: ['kotlin', 'kt'],
          }
          for (const [key, aliases] of Object.entries(map)) {
            if (aliases.includes(text)) { lang = key; break }
          }
        }
      }

      return { code, language: lang || 'cpp' }
    }

    // ─── Inject Button ─────────────────────────────

    function inject() {
      if (wrapEl) return

      const host = document.createElement('div')
      host.id = 'lc-tracker-btn-host'
      const shadow = host.attachShadow({ mode: 'closed' })

      const style = document.createElement('style')
      style.textContent = `
        .wrap {
          position: fixed; bottom: 28px; right: 28px; z-index: 99999;
          display: flex; align-items: center; gap: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
        }
        .label {
          font-size: 12px; font-weight: 500; color: #888;
          background: rgba(255,255,255,0.8); backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          padding: 5px 10px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          opacity: 0; transform: translateX(6px);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none; white-space: nowrap;
        }
        .wrap:hover .label { opacity: 1; transform: translateX(0); }
        .btn {
          width: 34px; height: 34px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.07);
          background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #444; cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; line-height: 1; user-select: none;
        }
        .btn:hover { background: rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .btn:active { transform: scale(0.9); }
        .btn .ico { transition: transform 0.2s; }
        .btn:hover .ico { transform: rotate(90deg); }
        .btn.loading { background: rgba(160,160,160,0.55); color: #fff; pointer-events: none; }
        .btn.loading .ico { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn.ok { background: rgba(34,197,94,0.8); color: #fff; }
        .btn.ok .ico { transform: none; }
        .btn.fail { background: rgba(239,68,68,0.8); color: #fff; }
        .btn.fail .ico { transform: none; }
        .btn.warn { background: rgba(245,158,11,0.8); color: #fff; }
        .btn.warn .ico { transform: none; }
      `

      const wrap = document.createElement('div')
      wrap.className = 'wrap'

      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = 'Add to Tracker'

      const btn = document.createElement('button')
      btn.className = 'btn'
      btn.innerHTML = '<span class="ico">+</span>'

      // ─── State helper ─────────────────────────────

      function setState(type: '' | 'loading' | 'ok' | 'fail' | 'warn', msg?: string) {
        if (statusTimeout) { clearTimeout(statusTimeout); statusTimeout = null }
        btn.className = 'btn'
        if (type) btn.classList.add(type)

        if (type === 'loading') {
          label.textContent = 'Fetching…'
          label.style.cssText = 'opacity:1;transform:translateX(0)'
          btn.innerHTML = '<span class="ico">⟳</span>'
        } else if (type === 'ok') {
          label.textContent = 'Added!'
          label.style.cssText = 'opacity:1;transform:translateX(0)'
          btn.innerHTML = '<span class="ico">✓</span>'
          statusTimeout = setTimeout(reset, 2000)
        } else if (type === 'fail') {
          label.textContent = msg || 'Failed'
          label.style.cssText = 'opacity:1;transform:translateX(0)'
          btn.innerHTML = '<span class="ico">✕</span>'
          statusTimeout = setTimeout(reset, 2000)
        } else if (type === 'warn') {
          label.textContent = msg || 'No code'
          label.style.cssText = 'opacity:1;transform:translateX(0)'
          btn.innerHTML = '<span class="ico">!</span>'
          statusTimeout = setTimeout(reset, 2000)
        }
      }

      function reset() {
        btn.className = 'btn'
        btn.innerHTML = '<span class="ico">+</span>'
        label.textContent = 'Add to Tracker'
        label.style.cssText = ''
        statusTimeout = null
      }

      btn.addEventListener('click', async () => {
        if (btn.classList.contains('loading')) return

        const slug = extractTitleSlug()
        if (!slug) { setState('fail', 'Invalid page'); return }

        setState('loading')

        const { code, language } = extractCode()
        if (isSubmissionPage() && !code) {
          setState('warn', 'Saving only')
          await new Promise(r => setTimeout(r, 1200))
        }

        const auth = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' })
        if (!auth.authenticated) { setState('fail', 'Login first'); return }

        const res = await chrome.runtime.sendMessage({
          action: 'ADD_SOLUTION', titleSlug: slug, code, language,
        })
        setState(res.success ? 'ok' : 'fail', res.error)
      })

      wrap.append(label, btn)
      shadow.append(style, wrap)
      document.body.append(host)

      wrapEl = wrap; labelEl = label; btnEl = btn
    }

    // ─── Init ──────────────────────────────────────

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject)
    } else {
      inject()
    }

    // Re-inject on SPA navigation
    let lastUrl = location.href
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        document.getElementById('lc-tracker-btn-host')?.remove()
        wrapEl = null; inject()
      }
    }).observe(document, { subtree: true, childList: true })
  },
})
