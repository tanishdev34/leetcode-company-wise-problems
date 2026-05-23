const APP_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://lc-grind.vercel.app'

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

// ─── Slug Extraction ─────────────────────────────

function extractTitleSlug(): string | null {
  const m = location.pathname.match(/\/problems\/([^/]+)/)
  return m ? m[1] : null
}

// ─── Overlay UI ──────────────────────────────────

function createOverlayUI(data: OverlayData) {
  const host = document.createElement('div')
  host.id = 'lc-tracker-overlay-host'
  const shadow = host.attachShadow({ mode: 'closed' })

  // Determine status display
  const solvedIcon = data.solved ? '✓' : '○'
  const solvedColor = data.solved ? '#22c55e' : '#6b7280'
  const solvedLabel = data.solved ? 'Solved' : 'Unsolved'
  const reviewLabel = data.reviewDue ? '⚠ Review due' : '✓ Up to date'
  const reviewColor = data.reviewDue ? '#f59e0b' : '#22c55e'
  const notesPreview = data.notes
    ? data.notes.length > 100
      ? data.notes.slice(0, 100) + '…'
      : data.notes
    : null
  const difficultyColor =
    data.difficulty === 'EASY'
      ? '#22c55e'
      : data.difficulty === 'MEDIUM'
        ? '#f59e0b'
        : '#ef4444'

  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
      display: block;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    .overlay-pill {
      position: fixed;
      bottom: 76px;
      left: 28px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
    }
    .pill-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      cursor: pointer;
      font-size: 13px;
      color: #333;
      transition: all 0.2s ease;
      user-select: none;
    }
    .pill-btn:hover {
      background: rgba(255,255,255,0.95);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .pill-btn .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${solvedColor};
      flex-shrink: 0;
    }
    .pill-btn .label-text {
      font-weight: 500;
    }
    .pill-btn .chevron {
      font-size: 10px;
      color: #999;
      transition: transform 0.2s ease;
    }
    .pill-btn .chevron.open {
      transform: rotate(180deg);
    }

    .panel {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 0;
      width: 320px;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      padding: 16px;
      display: none;
      max-height: 70vh;
      overflow-y: auto;
    }
    .panel.open {
      display: block;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: #111;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .difficulty-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: ${difficultyColor}18;
      color: ${difficultyColor};
      flex-shrink: 0;
      margin-left: 8px;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999;
      margin-bottom: 6px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }
    .status-icon {
      font-size: 16px;
      color: ${solvedColor};
    }
    .status-label {
      font-size: 13px;
      color: #333;
      font-weight: 500;
    }
    .toggle-btn {
      margin-left: auto;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.1);
      background: rgba(255,255,255,0.8);
      cursor: pointer;
      color: #555;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .toggle-btn:hover {
      background: #f3f4f6;
    }
    .toggle-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .review-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }
    .review-icon {
      font-size: 14px;
      color: ${reviewColor};
    }
    .review-label {
      font-size: 13px;
      color: #333;
    }
    .company-table {
      width: 100%;
      border-collapse: collapse;
    }
    .company-table th {
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 4px 0;
    }
    .company-table td {
      font-size: 13px;
      color: #333;
      padding: 3px 0;
    }
    .company-table td:last-child {
      text-align: right;
    }
    .notes-text {
      font-size: 13px;
      color: #555;
      line-height: 1.4;
      padding: 4px 0;
      font-style: ${notesPreview ? 'normal' : 'italic'};
    }
    .view-link {
      display: block;
      text-align: center;
      font-size: 12px;
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      padding: 8px 0 0;
      border-top: 1px solid rgba(0,0,0,0.06);
      margin-top: 8px;
    }
    .view-link:hover {
      text-decoration: underline;
    }
    .empty-state {
      font-size: 12px;
      color: #999;
      font-style: italic;
    }
    .toast {
      position: fixed;
      bottom: 120px;
      left: 28px;
      z-index: 100000;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: white;
      background: #333;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
    }
  `

  // ─── Pill Button ──────────────────────────────

  const pill = document.createElement('div')
  pill.className = 'overlay-pill'

  const pillBtn = document.createElement('button')
  pillBtn.className = 'pill-btn'
  pillBtn.innerHTML = `
    <span class="dot"></span>
    <span class="label-text">${solvedLabel}</span>
    <span class="chevron">▼</span>
  `

  // ─── Panel ────────────────────────────────────

  const panel = document.createElement('div')
  panel.className = 'panel'

  // Header
  const header = document.createElement('div')
  header.className = 'panel-header'
  header.innerHTML = `
    <span class="panel-title">${data.title}</span>
    <span class="difficulty-badge">${data.difficulty}</span>
  `
  panel.appendChild(header)

  // Solved status
  const solvedSection = document.createElement('div')
  solvedSection.className = 'section'
  solvedSection.innerHTML = `<div class="section-title">Status</div>`
  const statusRow = document.createElement('div')
  statusRow.className = 'status-row'
  statusRow.innerHTML = `
    <span class="status-icon">${solvedIcon}</span>
    <span class="status-label">${solvedLabel}</span>
    <button class="toggle-btn" id="toggle-solved-btn">
      ${data.solved ? 'Mark Unsolved' : 'Mark Solved'}
    </button>
  `
  solvedSection.appendChild(statusRow)
  panel.appendChild(solvedSection)

  // Review status
  const reviewSection = document.createElement('div')
  reviewSection.className = 'section'
  reviewSection.innerHTML = `<div class="section-title">Review</div>`
  const reviewRow = document.createElement('div')
  reviewRow.className = 'review-row'
  reviewRow.innerHTML = `
    <span class="review-icon">${data.reviewDue ? '⚠' : '✓'}</span>
    <span class="review-label">${reviewLabel} (${data.reviewCount} reviews)</span>
  `
  reviewSection.appendChild(reviewRow)
  panel.appendChild(reviewSection)

  // Company frequency
  const companySection = document.createElement('div')
  companySection.className = 'section'
  companySection.innerHTML = `<div class="section-title">Companies</div>`
  if (data.companies.length > 0) {
    const table = document.createElement('table')
    table.className = 'company-table'
    const thead = document.createElement('thead')
    thead.innerHTML = `<tr><th>Company</th><th>Frequency</th></tr>`
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    data.companies.forEach((c) => {
      const row = document.createElement('tr')
      row.innerHTML = `<td>${c.name}</td><td>${c.frequency > 0 ? c.frequency.toFixed(1) + '%' : '—'}</td>`
      tbody.appendChild(row)
    })
    table.appendChild(tbody)
    companySection.appendChild(table)
  } else {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent = 'No company data available'
    companySection.appendChild(empty)
  }
  panel.appendChild(companySection)

  // Notes preview
  const notesSection = document.createElement('div')
  notesSection.className = 'section'
  notesSection.innerHTML = `<div class="section-title">Notes</div>`
  const notesText = document.createElement('div')
  notesText.className = 'notes-text'
  notesText.textContent = notesPreview || 'No notes'
  notesSection.appendChild(notesText)
  panel.appendChild(notesSection)

  // View in tracker link
  const viewLink = document.createElement('a')
  viewLink.className = 'view-link'
  viewLink.href = `${APP_URL}/questions/${data.questionId}`
  viewLink.target = '_blank'
  viewLink.textContent = 'View in Tracker →'
  panel.appendChild(viewLink)

  // ─── Toast ─────────────────────────────────────

  const toast = document.createElement('div')
  toast.className = 'toast'
  document.body.appendChild(toast)

  let toastTimeout: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout)
    toast.textContent = msg
    toast.style.background = type === 'success' ? '#22c55e' : '#ef4444'
    toast.classList.add('show')
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500)
  }

  // ─── Toggle Solved ────────────────────────────

  const toggleBtn = statusRow.querySelector('#toggle-solved-btn') as HTMLButtonElement

  toggleBtn.addEventListener('click', async () => {
    toggleBtn.disabled = true
    toggleBtn.textContent = '…'
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'TOGGLE_SOLVED',
        slug: extractTitleSlug(),
        questionId: data.questionId,
      })
      if (res.success) {
        data.solved = !data.solved
        // Update pill
        const dot = pillBtn.querySelector('.dot') as HTMLElement
        const labelText = pillBtn.querySelector('.label-text') as HTMLElement
        const statusIcon = statusRow.querySelector('.status-icon') as HTMLElement
        const statusLabel = statusRow.querySelector('.status-label') as HTMLElement
        if (data.solved) {
          dot.style.background = '#22c55e'
          labelText.textContent = 'Solved'
          statusIcon.textContent = '✓'
          statusIcon.style.color = '#22c55e'
          statusLabel.textContent = 'Solved'
          toggleBtn.textContent = 'Mark Unsolved'
        } else {
          dot.style.background = '#6b7280'
          labelText.textContent = 'Unsolved'
          statusIcon.textContent = '○'
          statusIcon.style.color = '#6b7280'
          statusLabel.textContent = 'Unsolved'
          toggleBtn.textContent = 'Mark Solved'
        }
        showToast(data.solved ? 'Marked as solved' : 'Marked as unsolved')
      } else {
        showToast(res.error || 'Failed to toggle', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error')
    } finally {
      toggleBtn.disabled = false
    }
  })

  // ─── Toggle panel ─────────────────────────────

  let panelOpen = false
  pillBtn.addEventListener('click', () => {
    panelOpen = !panelOpen
    panel.classList.toggle('open', panelOpen)
    const chevron = pillBtn.querySelector('.chevron') as HTMLElement
    chevron.classList.toggle('open', panelOpen)
  })

  // ─── Assemble ─────────────────────────────────

  pill.appendChild(pillBtn)
  pill.appendChild(panel)
  shadow.append(style, pill)
  document.body.appendChild(host)
}

// ─── Main ────────────────────────────────────────

export default defineContentScript({
  matches: ['https://leetcode.com/problems/*'],
  main() {
    // Extract slug
    const slug = extractTitleSlug()
    if (!slug) return

    // Wait for page to load, then fetch data and create overlay
    function init() {
      chrome.runtime.sendMessage(
        { action: 'GET_OVERLAY_DATA', slug },
        (response) => {
          if (response?.success && response.data) {
            createOverlayUI(response.data)
          } else {
            console.warn('[LC Tracker] Overlay: no data for', slug)
          }
        }
      )
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
    } else {
      init()
    }

    // Re-init on SPA navigation
    let lastUrl = location.href
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        document.getElementById('lc-tracker-overlay-host')?.remove()
        const newSlug = extractTitleSlug()
        if (newSlug) {
          chrome.runtime.sendMessage(
            { action: 'GET_OVERLAY_DATA', slug: newSlug },
            (response) => {
              if (response?.success && response.data) {
                createOverlayUI(response.data)
              }
            }
          )
        }
      }
    }).observe(document, { subtree: true, childList: true })
  },
})
