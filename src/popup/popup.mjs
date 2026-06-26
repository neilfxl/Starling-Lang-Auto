import { getState, setState, ensureDefaults } from '../lib/storage.mjs'

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]?.id
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function pickPresetSummary(preset) {
  const count = preset?.languages?.length ?? 0
  const sample = Array.isArray(preset?.languages)
    ? preset.languages
        .slice(0, 4)
        .map((l) => l.code)
        .join(', ')
    : ''
  return count > 0 ? `${count} 项（${sample}${count > 4 ? '…' : ''}）` : '0 项'
}

async function refreshUI() {
  await ensureDefaults()
  const s = await getState()

  const presetSelect = document.getElementById('presetSelect')
  const presetHint = document.getElementById('presetHint')
  presetSelect.innerHTML = ''

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = '请选择预设'
  presetSelect.appendChild(placeholder)

  for (const p of s.stla_presets ?? []) {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.name
    presetSelect.appendChild(opt)
  }
  presetSelect.value = s.stla_current_preset_id || ''

  const current = (s.stla_presets ?? []).find((p) => p.id === s.stla_current_preset_id)
  presetHint.textContent = current ? pickPresetSummary(current) : '未选择预设'

  const autoApply = document.getElementById('autoApply')
  const autoConfirm = document.getElementById('autoConfirm')
  autoApply.checked = Boolean(s.stla_auto_apply_enabled)
  autoConfirm.checked = Boolean(s.stla_auto_confirm_enabled)

  const { stla_run_logs: logs = [] } = s
  const last = logs[0]
  document.getElementById('lastRun').textContent =
    last && last.time ? `${fmtTime(last.time)} · ${last.status}` : '—'

  const tabId = await getActiveTabId()
  if (!tabId) {
    document.getElementById('pageState').textContent = '未找到当前标签页'
    return
  }
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: 'STLA_GET_PAGE_STATE' })
    document.getElementById('pageState').textContent = resp?.isStarlingLike
      ? '已检测到 Starling 相关页面'
      : '未检测到 Starling'
  } catch {
    document.getElementById('pageState').textContent = '当前页面未注入内容脚本'
  }
}

async function applyNow() {
  const error = document.getElementById('error')
  error.textContent = ''

  const btn = document.getElementById('applyNow')
  btn.disabled = true
  try {
    const tabId = await getActiveTabId()
    if (!tabId) throw new Error('未找到当前标签页')

    const s = await getState()
    const preset = (s.stla_presets ?? []).find((p) => p.id === s.stla_current_preset_id)
    if (!preset) throw new Error('请先选择预设')
    const codes = (preset?.languages ?? []).map((l) => l.code).filter(Boolean)
    if (codes.length === 0) throw new Error('当前预设为空')

    const payload = {
      type: 'STLA_APPLY',
      codes,
      autoConfirm: Boolean(s.stla_auto_confirm_enabled)
    }

    try {
      const resp = await chrome.tabs.sendMessage(tabId, payload)
      if (!resp?.ok) {
        throw new Error(String(resp?.error || '执行失败'))
      }
    } catch (e) {
      const msg = String(e?.message ?? e)
      if (msg.includes('Receiving end does not exist')) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['src/content-script/contentScript.js'] })
        const resp2 = await chrome.tabs.sendMessage(tabId, payload)
        if (!resp2?.ok) {
          throw new Error(String(resp2?.error || '执行失败'))
        }
      } else {
        throw e
      }
    }
    await refreshUI()
  } catch (e) {
    error.textContent = String(e?.message ?? e)
  } finally {
    btn.disabled = false
  }
}

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

document.getElementById('presetSelect').addEventListener('change', async (e) => {
  await setState({ stla_current_preset_id: e.target.value })
  await refreshUI()
})

document.getElementById('autoApply').addEventListener('change', async (e) => {
  await setState({ stla_auto_apply_enabled: Boolean(e.target.checked) })
})

document.getElementById('autoConfirm').addEventListener('change', async (e) => {
  await setState({ stla_auto_confirm_enabled: Boolean(e.target.checked) })
})

document.getElementById('applyNow').addEventListener('click', applyNow)

refreshUI()
