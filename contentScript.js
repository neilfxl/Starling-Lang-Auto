(function () {
  const STORAGE_KEYS = [
    'stla_current_preset_id',
    'stla_presets',
    'stla_match_rules',
    'stla_auto_apply_enabled',
    'stla_auto_confirm_enabled',
    'stla_llm_auto_apply_enabled',
    'stla_run_logs'
  ]

  const state = {
    isStarlingLike: false,
    lastRun: null,
    overlayOpen: false
  }

  try {
    chrome.runtime.sendMessage({ type: 'STLA_ENSURE_DEFAULTS' })
  } catch {}

  function nowId(prefix) {
    return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`
  }

  function setText(node, text) {
    if (node) node.textContent = text
  }

  function safeText(el) {
    return String(el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function nodeListIncludesText(nodes, needle, limit) {
    const n = String(needle ?? '')
    if (!n) return false
    const list = Array.from(nodes)
    const max = Number.isFinite(limit) ? limit : 250
    for (let i = 0; i < list.length && i < max; i++) {
      const t = safeText(list[i])
      if (t.includes(n)) return true
    }
    return false
  }

  function matchRuleForUrl(rules, url) {
    const list = Array.isArray(rules) ? rules : []
    const u = String(url ?? '')
    const enabled = list.filter((r) => r && r.enabled)
    enabled.sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))

    for (const rule of enabled) {
      if (rule.urlRegex) {
        try {
          const re = new RegExp(rule.urlRegex)
          if (!re.test(u)) continue
          return rule
        } catch {
          continue
        }
      }

      if (Array.isArray(rule.urlIncludes) && rule.urlIncludes.length > 0) {
        const ok = rule.urlIncludes.every((token) => u.includes(String(token)))
        if (!ok) continue
        return rule
      }
    }
    return null
  }

  const LLM_LANGUAGE_MAP = {
    gemini: [
      'ar',
      'my-MM',
      'nl-NL',
      'fil-PH',
      'de-DE',
      'el-GR',
      'he-IL',
      'it-IT',
      'ja-JP',
      'km-KH',
      'ko-KR',
      'ms-MY',
      'pt-BR',
      'ro-RO',
      'ru-RU',
      'es-LA',
      'sv-SE',
      'th-TH',
      'zh-Hant-TW',
      'tr-TR',
      'uk-UA',
      'ur-PK',
      'vi-VN'
    ],
    gpt: ['cs-CZ', 'fi-FI', 'fr-FR', 'hu-HU', 'id-ID', 'pl-PL']
  }

  function createOverlay() {
    const host = document.createElement('div')
    host.id = 'stla-overlay-host'
    host.style.position = 'fixed'
    host.style.top = '12px'
    host.style.right = '12px'
    host.style.zIndex = '2147483647'
    const root = host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      :host{all:initial}
      .wrap{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial;position:relative;}
      .fab{width:40px;height:40px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:#0B1220;color:#E5E7EB;cursor:grab;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.35)}
      .fab:hover{background:rgba(255,255,255,0.06)}
      .panel{width:320px;border-radius:14px;border:1px solid rgba(255,255,255,0.10);background:#111B2E;color:#E5E7EB;box-shadow:0 10px 30px rgba(0,0,0,0.35);overflow:hidden;position:absolute;right:0;top:0}
      .hd{display:flex;align-items:center;justify-content:space-between;padding:10px 10px;border-bottom:1px solid rgba(255,255,255,0.08);cursor:move}
      .ttl{font-weight:700;font-size:12px}
      .sub{font-size:11px;color:#9CA3AF;margin-top:2px}
      .body{padding:10px}
      .row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:6px 0;font-size:12px}
      .muted{color:#9CA3AF}
      .btns{display:flex;gap:8px;margin-top:10px}
      .btn{flex:1;border-radius:10px;padding:8px 10px;border:1px solid rgba(255,255,255,0.10);background:transparent;color:#E5E7EB;cursor:pointer;font-weight:600;font-size:12px}
      .btn:hover{background:rgba(255,255,255,0.06)}
      .btnP{background:#3B82F6;border:none}
      .btnP:hover{filter:brightness(0.92)}
      .err{margin-top:8px;font-size:11px;color:#EF4444;min-height:14px}
    `

    const wrap = document.createElement('div')
    wrap.className = 'wrap'

    const fab = document.createElement('button')
    fab.className = 'fab'
    fab.textContent = 'AP'

    const panel = document.createElement('div')
    panel.className = 'panel'
    panel.style.display = 'none'

    const hd = document.createElement('div')
    hd.className = 'hd'
    const hdLeft = document.createElement('div')
    const ttl = document.createElement('div')
    ttl.className = 'ttl'
    ttl.textContent = 'Starling 自动勾选'
    const sub = document.createElement('div')
    sub.className = 'sub'
    sub.textContent = '待命'
    hdLeft.append(ttl, sub)
    const close = document.createElement('button')
    close.className = 'btn'
    close.style.flex = '0 0 auto'
    close.style.padding = '6px 8px'
    close.textContent = '收起'
    hd.append(hdLeft, close)

    const body = document.createElement('div')
    body.className = 'body'

    const r1 = document.createElement('div')
    r1.className = 'row'
    const l1 = document.createElement('div')
    l1.className = 'muted'
    l1.textContent = '页面检测'
    const v1 = document.createElement('div')
    v1.id = 'stla-v1'
    v1.textContent = '—'
    r1.append(l1, v1)

    const r2 = document.createElement('div')
    r2.className = 'row'
    const l2 = document.createElement('div')
    l2.className = 'muted'
    l2.textContent = '上次执行'
    const v2 = document.createElement('div')
    v2.id = 'stla-v2'
    v2.textContent = '—'
    r2.append(l2, v2)

    const toggles = document.createElement('div')
    toggles.className = 'row'
    toggles.style.flexDirection = 'column'
    toggles.style.alignItems = 'flex-start'
    toggles.style.gap = '6px'
    const autoApplyToggle = document.createElement('label')
    autoApplyToggle.className = 'row'
    autoApplyToggle.style.justifyContent = 'flex-start'
    autoApplyToggle.style.gap = '8px'
    autoApplyToggle.style.padding = '0'
    const autoApplyInput = document.createElement('input')
    autoApplyInput.type = 'checkbox'
    const autoApplyText = document.createElement('span')
    autoApplyText.textContent = '进入匹配页面后自动应用'
    autoApplyToggle.append(autoApplyInput, autoApplyText)

    const autoConfirmToggle = document.createElement('label')
    autoConfirmToggle.className = 'row'
    autoConfirmToggle.style.justifyContent = 'flex-start'
    autoConfirmToggle.style.gap = '8px'
    autoConfirmToggle.style.padding = '0'
    const autoConfirmInput = document.createElement('input')
    autoConfirmInput.type = 'checkbox'
    const autoConfirmText = document.createElement('span')
    autoConfirmText.textContent = '自动点击“确定/保存”'
    autoConfirmToggle.append(autoConfirmInput, autoConfirmText)

    toggles.append(autoApplyToggle, autoConfirmToggle)

    const btns = document.createElement('div')
    btns.className = 'btns'
    const apply = document.createElement('button')
    apply.className = 'btn btnP'
    apply.textContent = '立即应用'
    const openOptions = document.createElement('button')
    openOptions.className = 'btn'
    openOptions.textContent = '打开设置'
    btns.append(apply, openOptions)

    const err = document.createElement('div')
    err.className = 'err'
    err.id = 'stla-err'
    body.append(r1, r2, toggles, btns, err)

    panel.append(hd, body)
    wrap.append(fab, panel)
    root.append(style, wrap)

    async function syncToggles() {
      try {
        const s = await getConfig()
        autoApplyInput.checked = Boolean(s.stla_auto_apply_enabled)
        autoConfirmInput.checked = Boolean(s.stla_auto_confirm_enabled)
      } catch {}
    }

    function setOpen(open) {
      state.overlayOpen = open
      panel.style.display = open ? 'block' : 'none'
      fab.style.display = open ? 'none' : 'flex'
      if (open) syncToggles()
    }

    let dragJustHappened = false
    fab.addEventListener('click', () => {
      if (dragJustHappened) return
      setOpen(true)
    })
    close.addEventListener('click', () => setOpen(false))
    openOptions.addEventListener('click', async () => {
      try {
        await chrome.runtime.openOptionsPage()
      } catch {
        try {
          const resp = await chrome.runtime.sendMessage({ type: 'STLA_OPEN_OPTIONS' })
          if (!resp?.ok) throw new Error(String(resp?.error || '打开设置失败'))
        } catch (e) {
          err.textContent = String(e?.message ?? e)
        }
      }
    })
    autoApplyInput.addEventListener('change', async (e) => {
      try {
        await chrome.storage.local.set({ stla_auto_apply_enabled: Boolean(e.target.checked) })
      } catch {}
    })
    autoConfirmInput.addEventListener('change', async (e) => {
      try {
        await chrome.storage.local.set({ stla_auto_confirm_enabled: Boolean(e.target.checked) })
      } catch {}
    })
    apply.addEventListener('click', async () => {
      err.textContent = ''
      try {
        const s = await getConfig()
        const preset = (s.stla_presets ?? []).find((p) => p.id === s.stla_current_preset_id)
        if (!preset) throw new Error('请先选择预设')
        const codes = (preset?.languages ?? []).map((x) => x.code).filter(Boolean)
        if (!codes.length) throw new Error('当前预设为空')
        await applyLanguages({ codes, autoConfirm: Boolean(s.stla_auto_confirm_enabled) })
      } catch (e) {
        err.textContent = String(e?.message ?? e)
      }
      updateOverlay()
    })

    const enableDrag = (handle) => {
      let dragging = false
      let startX = 0
      let startY = 0
      let startLeft = 0
      let startTop = 0
      let dragMoved = false
      let boxWidth = 0
      let boxHeight = 0

      const onMove = (e) => {
        if (!dragging) return
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true
        const maxX = window.innerWidth - boxWidth
        const maxY = window.innerHeight - boxHeight
        const nextLeft = Math.min(Math.max(startLeft + dx, 0), Math.max(maxX, 0))
        const nextTop = Math.min(Math.max(startTop + dy, 0), Math.max(maxY, 0))
        host.style.left = `${nextLeft}px`
        host.style.top = `${nextTop}px`
      }

      const onUp = () => {
        if (!dragging) return
        dragging = false
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        dragJustHappened = dragMoved
        if (dragMoved) setTimeout(() => (dragJustHappened = false), 150)
      }

      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return
        const rect = host.getBoundingClientRect()
        startX = e.clientX
        startY = e.clientY
        startLeft = rect.left
        startTop = rect.top
        boxWidth = rect.width
        boxHeight = rect.height
        host.style.left = `${startLeft}px`
        host.style.top = `${startTop}px`
        host.style.right = 'auto'
        host.style.bottom = 'auto'
        dragging = true
        dragMoved = false
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      })
    }

    enableDrag(fab)
    enableDrag(hd)

    return {
      host,
      setSubtitle: (t) => setText(sub, t),
      setPageState: (t) => setText(v1, t),
      setLastRun: (t) => setText(v2, t),
      setError: (t) => setText(err, t),
      syncToggles
    }
  }

  let overlay = null

  function ensureOverlay() {
    if (overlay) return overlay
    overlay = createOverlay()
    document.documentElement.appendChild(overlay.host)
    return overlay
  }

  function hideOverlay() {
    if (!overlay) return
    overlay.host.style.display = 'none'
  }

  function showOverlay() {
    const o = ensureOverlay()
    o.host.style.display = 'block'
    return o
  }

  function fmtTime(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  async function getConfig() {
    const s = await chrome.storage.local.get(STORAGE_KEYS)
    return s
  }

  async function appendRunLog(item) {
    const { stla_run_logs: logs = [] } = await chrome.storage.local.get('stla_run_logs')
    const next = [item, ...logs].slice(0, 50)
    await chrome.storage.local.set({ stla_run_logs: next })
  }

  function findModalRoot() {
    const candidates = Array.from(
      document.querySelectorAll('[role="dialog"], [role="modal"], .arco-modal, .ant-modal, .semi-modal, .modal, dialog')
    )
    const hits = candidates.filter((el) => {
      const t = safeText(el)
      return t.includes('自定义目标语言') || t.includes('Customize target language')
    })
    if (hits.length) return hits[hits.length - 1]

    const fallback = Array.from(document.querySelectorAll('div,section,dialog'))
      .filter((el) => {
        const t = safeText(el)
        return t.includes('自定义目标语言') || t.includes('Customize target language')
      })
      .slice(-1)[0]
    return fallback || null
  }

  function findLlmModal() {
    const candidates = Array.from(
      document.querySelectorAll('[role="dialog"], [role="modal"], .arco-modal, .ant-modal, .semi-modal, .modal, dialog')
    )
    const hits = candidates.filter((el) => {
      const t = safeText(el)
      return t.includes('Gemini 翻译') || t.includes('GPT 翻译')
    })
    if (hits.length) return hits[hits.length - 1]
    return null
  }

  function detectLlmType(modal) {
    const text = safeText(modal)
    if (!text) return null
    if (text.includes('Gemini 翻译') || text.includes('Gemini')) return 'gemini'
    if (text.includes('GPT 翻译') || text.includes('GPT')) return 'gpt'
    return null
  }

  function findCustomCheckbox(modal) {
    const textNodes = Array.from(modal.querySelectorAll('label, span, div'))
    const label = textNodes.find((n) => {
      const t = safeText(n)
      return (
        t.includes('自定义目标语言') ||
        t.includes('添加翻译语种') ||
        t.includes('Customize target language')
      )
    })
    if (!label) return null
    const cb =
      label.querySelector('input[type="checkbox"]') ||
      label.closest('label')?.querySelector('input[type="checkbox"]') ||
      label.closest('.ant-checkbox-wrapper, .arco-checkbox, .semi-checkbox, .custom-locale-warp')?.querySelector(
        'input[type="checkbox"]'
      )
    return cb || null
  }

  function clickCheckbox(cb) {
    if (!cb) return false
    if (cb.checked) return true
    const wrapper = cb.closest(
      '.semi-transfer-item, .semi-checkbox, .semi-checkbox-wrapper, .ant-checkbox-wrapper, .arco-checkbox, [role="checkbox"]'
    )
    const inner = wrapper?.querySelector?.('.semi-checkbox-inner, .semi-checkbox-addon')
    if (inner) {
      inner.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      if (cb.checked) return true
    }
    if (wrapper && wrapper !== cb) {
      wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      if (cb.checked) return true
    }
    cb.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    if (cb.checked) return true
    cb.click()
    if (cb.checked) return true
    try {
      cb.checked = true
      cb.dispatchEvent(new Event('input', { bubbles: true }))
      cb.dispatchEvent(new Event('change', { bubbles: true }))
    } catch {}
    return true
  }

  function clickItem(item) {
    if (!item) return false
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }

  function findSearchInput(modal) {
    const inputs = Array.from(modal.querySelectorAll('input'))
    const search = inputs.find((i) => {
      const ph = String(i.getAttribute('placeholder') ?? '')
      const type = String(i.getAttribute('type') ?? '')
      return type === 'search' || ph.includes('搜索') || ph.toLowerCase().includes('search')
    })
    if (search) return search
    const transfer = modal.querySelector('.semi-transfer-filter input')
    return transfer || null
  }

  function setInputValue(input, value) {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
    proto?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function findLanguageItem(modal, code) {
    const raw = String(code ?? '').trim()
    if (!raw) return null
    const re = new RegExp(`\\[\\s*${escapeRegExp(raw)}\\s*\\]`, 'i')
    const items = Array.from(modal.querySelectorAll('.semi-transfer-item'))
    for (const item of items) {
      const t = safeText(item)
      if (!t) continue
      if (!re.test(t) && !t.toLowerCase().includes(raw.toLowerCase())) continue
      const cb = item.querySelector('input[type="checkbox"]')
      return { item, checkbox: cb }
    }

    const nodes = Array.from(modal.querySelectorAll('label, li, div, span, .semi-transfer-item, .semi-checkbox, .semi-checkbox-addon'))
    for (const n of nodes) {
      const t = safeText(n)
      if (!t) continue
      if (!re.test(t) && !t.toLowerCase().includes(raw.toLowerCase())) continue

      const cb =
        n.querySelector('input[type="checkbox"]') ||
        n.closest('label')?.querySelector('input[type="checkbox"]') ||
        n.closest(
          'li, [role="option"], .semi-transfer-item, .semi-checkbox, .semi-checkbox-wrapper, .ant-checkbox-wrapper, .arco-checkbox'
        )?.querySelector('input[type="checkbox"]')
      if (cb) return { item: n, checkbox: cb }

      const roleCheckbox = n.closest('[role="checkbox"]')
      if (roleCheckbox) return { item: roleCheckbox, checkbox: roleCheckbox }

      const clickable = n.closest(
        'label, li, [role="option"], .semi-transfer-item, .arco-checkbox, .ant-checkbox-wrapper, .semi-checkbox, .semi-checkbox-wrapper'
      )
      if (clickable) return { item: clickable, checkbox: clickable.querySelector('input[type="checkbox"]') }
    }
    return null
  }

  async function waitFor(fn, timeoutMs) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const v = fn()
      if (v) return v
      await new Promise((r) => setTimeout(r, 120))
    }
    return null
  }

  async function applyLanguages({ codes, autoConfirm, modalRoot }) {
    showOverlay()
    overlay.setError('')
    overlay.setSubtitle('执行中…')

    const modal = modalRoot || (await waitFor(findModalRoot, 8000))
    if (!modal) throw new Error('未找到目标语言选择弹窗/区域')

    const custom = findCustomCheckbox(modal)
    if (custom) clickCheckbox(custom)

    const search = findSearchInput(modal)
    const ensureVisible = (el) => {
      try {
        el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
        const parent = el?.closest?.('.semi-transfer-left-list, .semi-transfer-right-list')
        if (parent && typeof el?.offsetTop === 'number') parent.scrollTop = el.offsetTop - 40
      } catch {}
    }
    let selected = 0
    for (let i = 0; i < codes.length; i++) {
      const code = String(codes[i]).trim()
      if (!code) continue

      const tryPick = async () => {
        const found = findLanguageItem(modal, code)
        if (found?.checkbox) {
          ensureVisible(found.checkbox)
          if (!found.checkbox.checked) {
            clickCheckbox(found.checkbox)
            if (found.checkbox.checked) selected += 1
            return found.checkbox.checked
          }
          return true
        }
        if (found?.item) {
          ensureVisible(found.item)
          const input = found.item.querySelector?.('input[type="checkbox"]')
          if (input && !input.checked) {
            clickCheckbox(input)
            if (input.checked) selected += 1
            return input.checked
          }
          clickItem(found.item)
          selected += 1
          return true
        }
        return false
      }

      if (!(await tryPick()) && search) {
        setInputValue(search, code)
        await new Promise((r) => setTimeout(r, 140))
        await tryPick()
        setInputValue(search, '')
      }

      await new Promise((r) => setTimeout(r, 120))
    }

    if (autoConfirm && selected > 0) {
      const btns = Array.from(modal.querySelectorAll('button, [role="button"]'))
      const okBtn = btns.find((b) => {
        const t = safeText(b)
        return t === '确定' || t === '保存' || t === '确认'
      })
      if (okBtn) okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }

    const run = {
      id: nowId('run'),
      time: Date.now(),
      url: location.href,
      selectedCount: selected,
      status: 'success'
    }
    state.lastRun = run
    await appendRunLog(run)

    overlay.setSubtitle('完成')
    updateOverlay()
    return run
  }

  function detectStarlingLike() {
    const modal = findModalRoot()
    if (modal) return true
    const main = document.querySelector('main') || document.querySelector('form') || document.body
    if (!main) return false
    const needles = ['自定义目标语言', '翻译任务名称', 'Customize target language', 'Add task', 'Name']
    const candidates = main.querySelectorAll('label, span, div, h1, h2, h3')
    if (!nodeListIncludesText(candidates, needles[0], 260)) return false
    const hasCn = nodeListIncludesText(candidates, needles[1], 260)
    const hasEn = nodeListIncludesText(candidates, needles[3], 260) || nodeListIncludesText(candidates, needles[4], 260)
    if (!hasCn && !hasEn) return false
    return true
  }

  function updateOverlay() {
    const o = showOverlay()
    o.setPageState(state.isStarlingLike ? '已识别' : '未识别')
    o.setLastRun(state.lastRun?.time ? `${fmtTime(state.lastRun.time)} · ${state.lastRun.status}` : '—')
    o.syncToggles?.()
  }

  let scheduled = null
  async function autoTick() {
    scheduled = null
    const llmModal = findLlmModal()
    state.isStarlingLike = detectStarlingLike() || Boolean(llmModal)
    if (!state.isStarlingLike) {
      hideOverlay()
      return
    }
    updateOverlay()

    const s = await getConfig()
    if (llmModal) {
      if (!s.stla_llm_auto_apply_enabled) return
      if (state.lastRun && Date.now() - state.lastRun.time < 8000) return
      const llmType = detectLlmType(llmModal)
      const codes = LLM_LANGUAGE_MAP[llmType] || []
      if (!codes.length) return
      try {
        await applyLanguages({ codes, autoConfirm: Boolean(s.stla_auto_confirm_enabled), modalRoot: llmModal })
      } catch (e) {
        const run = {
          id: nowId('run'),
          time: Date.now(),
          url: location.href,
          status: 'failed',
          errorMessage: String(e?.message ?? e)
        }
        state.lastRun = run
        await appendRunLog(run)
        showOverlay().setError(run.errorMessage)
        showOverlay().setSubtitle('失败')
        updateOverlay()
      }
      return
    }

    if (!s.stla_auto_apply_enabled) return
    const rule = matchRuleForUrl(s.stla_match_rules, location.href)
    const presetId = rule?.presetId || s.stla_current_preset_id
    const preset = (s.stla_presets ?? []).find((p) => p.id === presetId)
    const codes = (preset?.languages ?? []).map((x) => x.code).filter(Boolean)
    if (!codes.length) {
      if (state.lastRun && Date.now() - state.lastRun.time < 8000) return
      const run = {
        id: nowId('run'),
        time: Date.now(),
        url: location.href,
        status: 'no_preset',
        errorMessage: '未选择预设'
      }
      state.lastRun = run
      await appendRunLog(run)
      showOverlay().setError(run.errorMessage)
      showOverlay().setSubtitle('待配置')
      updateOverlay()
      return
    }

    const modal = findModalRoot()
    if (!modal) return
    if (state.lastRun && Date.now() - state.lastRun.time < 8000) return

    try {
      await applyLanguages({ codes, autoConfirm: Boolean(s.stla_auto_confirm_enabled) })
    } catch (e) {
      const run = {
        id: nowId('run'),
        time: Date.now(),
        url: location.href,
        status: 'failed',
        errorMessage: String(e?.message ?? e)
      }
      state.lastRun = run
      await appendRunLog(run)
      showOverlay().setError(run.errorMessage)
      showOverlay().setSubtitle('失败')
      updateOverlay()
    }
  }

  function scheduleAutoTick() {
    if (scheduled) return
    scheduled = setTimeout(autoTick, 400)
  }

  const obs = new MutationObserver(scheduleAutoTick)
  obs.observe(document.documentElement, { subtree: true, childList: true })

  scheduleAutoTick()
  window.addEventListener('popstate', scheduleAutoTick)
  window.addEventListener('hashchange', scheduleAutoTick)

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return

    if (message.type === 'STLA_GET_PAGE_STATE') {
      state.isStarlingLike = detectStarlingLike()
      sendResponse({
        isStarlingLike: state.isStarlingLike,
        lastRun: state.lastRun
      })
      return
    }

    if (message.type === 'STLA_APPLY') {
      const codes = Array.isArray(message.codes) ? message.codes : []
      const autoConfirm = Boolean(message.autoConfirm)
      applyLanguages({ codes, autoConfirm })
        .then((r) => sendResponse({ ok: true, run: r }))
        .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) }))
      return true
    }
  })
})()
