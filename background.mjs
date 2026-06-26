import { ensureDefaults } from './lib/storage.mjs'

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return

  if (message.type === 'STLA_ENSURE_DEFAULTS') {
    ensureDefaults()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) }))
    return true
  }

  if (message.type === 'STLA_OPEN_OPTIONS') {
    const url = chrome.runtime.getURL('options.html')
    chrome.runtime
      .openOptionsPage()
      .then(() => sendResponse({ ok: true }))
      .catch(async () => {
        try {
          await chrome.tabs.create({ url })
          sendResponse({ ok: true })
        } catch (e) {
          sendResponse({ ok: false, error: String(e?.message ?? e) })
        }
      })
    return true
  }
})
