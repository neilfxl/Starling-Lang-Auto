import { getDefaultState } from './defaults.mjs'

const KEYS = [
  'stla_current_preset_id',
  'stla_presets',
  'stla_match_rules',
  'stla_auto_apply_enabled',
  'stla_auto_confirm_enabled',
  'stla_llm_auto_apply_enabled',
  'stla_run_logs'
]

export async function ensureDefaults() {
  const defaults = getDefaultState()
  const existing = await chrome.storage.local.get(KEYS)
  const patch = {}

  for (const k of KEYS) {
    if (existing[k] === undefined) patch[k] = defaults[k]
  }

  if (Object.keys(patch).length > 0) {
    await chrome.storage.local.set(patch)
  }
}

export async function getState() {
  await ensureDefaults()
  const s = await chrome.storage.local.get(KEYS)
  return s
}

export async function setState(partial) {
  const p = partial && typeof partial === 'object' ? partial : {}
  const next = {}
  for (const k of Object.keys(p)) {
    if (KEYS.includes(k)) next[k] = p[k]
  }
  if (Object.keys(next).length === 0) return
  await chrome.storage.local.set(next)
}

export async function appendRunLog(item) {
  const { stla_run_logs: logs = [] } = await chrome.storage.local.get('stla_run_logs')
  const next = [item, ...logs].slice(0, 50)
  await chrome.storage.local.set({ stla_run_logs: next })
}
